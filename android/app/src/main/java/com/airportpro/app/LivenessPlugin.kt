package com.airportpro.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.*
import kotlin.math.abs


@CapacitorPlugin(name = "LivenessPlugin")
class LivenessPlugin : Plugin() {

    companion object {
        private const val TAG = "LivenessPlugin"
        private const val MIN_FACE_SIZE = 0.15f
        private const val EYE_OPEN_THRESHOLD = 0.3f
        private const val HEAD_POSE_THRESHOLD = 20f
        private const val MIN_FACE_WIDTH = 150
        private const val MIN_FACE_HEIGHT = 200
        private const val CONFIDENCE_THRESHOLD = 0.6f
        private const val SMILE_THRESHOLD = 0.8f
    }

    private lateinit var detector: FaceDetector
    private val pluginScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun load() {
        try {
            // Configure face detector with optimal settings for liveness detection
            val options = FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
                .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
                .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
                .setMinFaceSize(MIN_FACE_SIZE)
                .enableTracking()
                .build()

            detector = FaceDetection.getClient(options)
            Log.i(TAG, "LivenessPlugin initialized with ML Kit Face Detection")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize ML Kit Face Detection", e)
        }
    }

    @PluginMethod
    fun checkLiveness(call: PluginCall) {
        val imageData = call.getString("imageData")
        
        if (imageData.isNullOrBlank()) {
            call.reject("No image data provided")
            return
        }

        pluginScope.launch {
            try {
                val bitmap = decodeBase64Image(imageData)
                if (bitmap == null) {
                    call.reject("Failed to decode image - Invalid base64 format")
                    return@launch
                }

                // Validate image dimensions
                if (bitmap.width < 300 || bitmap.height < 300) {
                    call.reject("Image too small - Minimum 300x300 pixels required")
                    return@launch
                }

                // Create InputImage and process with ML Kit
                val image = InputImage.fromBitmap(bitmap, 0)
                processLivenessDetection(image, call)

            } catch (e: Exception) {
                Log.e(TAG, "Error processing liveness check", e)
                call.reject("Error processing image: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun checkNFCSupport(call: PluginCall) {
        try {
            // Check if device has NFC capability
            val nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(context)
            val result = JSObject().apply {
                put("supported", nfcAdapter != null)
                put("enabled", nfcAdapter?.isEnabled == true)
                put("available", nfcAdapter != null && nfcAdapter.isEnabled)
            }
            
            Log.d(TAG, "NFC Support check: $result")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking NFC support", e)
            val result = JSObject().apply {
                put("supported", false)
                put("enabled", false)
                put("error", e.localizedMessage)
            }
            call.resolve(result)
        }
    }

    private fun decodeBase64Image(imageData: String): Bitmap? {
        return try {
            // Handle data URLs (data:image/jpeg;base64,...)
            val base64Image = if (imageData.contains(",")) {
                imageData.split(",")[1]
            } else {
                imageData
            }
            
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode base64 image", e)
            null
        }
    }

    private fun processLivenessDetection(image: InputImage, call: PluginCall) {
        detector.process(image)
            .addOnSuccessListener { faces ->
                try {
                    val result = analyzeFacesForLiveness(faces)
                    val response = createLivenessResponse(result, faces.size)
                    
                    Log.d(TAG, "Liveness detection complete: $result")
                    call.resolve(response)
                } catch (e: Exception) {
                    Log.e(TAG, "Error analyzing faces for liveness", e)
                    call.reject("Error analyzing faces: ${e.localizedMessage}")
                }
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "ML Kit face detection failed", exception)
                call.reject("Face detection failed: ${exception.localizedMessage}")
            }
    }

    private fun analyzeFacesForLiveness(faces: List<Face>): LivenessResult {
        if (faces.isEmpty()) {
            return LivenessResult(
                isLive = false,
                faceDetected = false,
                confidence = 0.0f,
                details = "No faces detected in image"
            )
        }

        // Select the best face for analysis
        val primaryFace = faces.maxByOrNull { face ->
            face.boundingBox.width() * face.boundingBox.height()
        } ?: faces.first()
        
        return analyzePrimaryFace(primaryFace)
    }

    private fun analyzePrimaryFace(face: Face): LivenessResult {
        val result = LivenessResult()
        result.faceDetected = true

        // Check eye openness (critical liveness indicator)
        val (eyesOpen, eyeConfidence) = checkEyeOpenness(face)
        result.eyesOpen = eyesOpen

        // Check face size (ensure face is close enough)
        val faceSizeValid = checkFaceSize(face.boundingBox)

        // Check head pose (ensure face is roughly frontal)
        val headPoseValid = checkHeadPose(face)
        result.headPose = headPoseValid

        // Check facial expression (should be natural, not overly smiling)
        val expressionNatural = checkNaturalExpression(face)

        // Calculate overall confidence score
        val checks = listOf(eyesOpen, faceSizeValid, headPoseValid, expressionNatural)
        val passedChecks = checks.count { it }
        
        result.confidence = (passedChecks.toFloat() / checks.size) + (if (eyeConfidence > 0.8f) 0.1f else 0.0f)
        result.confidence = minOf(result.confidence, 1.0f)
        result.isLive = result.confidence > CONFIDENCE_THRESHOLD && passedChecks >= 3

        result.details = "Eyes: $eyesOpen, Size: $faceSizeValid, Pose: $headPoseValid, Expression: $expressionNatural"

        return result
    }

    private fun checkEyeOpenness(face: Face): Pair<Boolean, Float> {
        val leftEyeOpen = face.leftEyeOpenProbability
        val rightEyeOpen = face.rightEyeOpenProbability
        
        return when {
            leftEyeOpen != null && rightEyeOpen != null -> {
                val bothOpen = leftEyeOpen > EYE_OPEN_THRESHOLD && rightEyeOpen > EYE_OPEN_THRESHOLD
                val confidence = (leftEyeOpen + rightEyeOpen) / 2.0f
                Pair(bothOpen, confidence)
            }
            leftEyeOpen != null -> Pair(leftEyeOpen > EYE_OPEN_THRESHOLD, leftEyeOpen)
            rightEyeOpen != null -> Pair(rightEyeOpen > EYE_OPEN_THRESHOLD, rightEyeOpen)
            else -> Pair(true, 0.5f) // Default assumption if eye detection fails
        }
    }

    private fun checkFaceSize(boundingBox: Rect): Boolean {
        return boundingBox.width() >= MIN_FACE_WIDTH && boundingBox.height() >= MIN_FACE_HEIGHT
    }

    private fun checkHeadPose(face: Face): Boolean {
        val rotX = abs(face.headEulerAngleX)
        val rotY = abs(face.headEulerAngleY) 
        val rotZ = abs(face.headEulerAngleZ)
        
        return rotX < HEAD_POSE_THRESHOLD && 
               rotY < HEAD_POSE_THRESHOLD && 
               rotZ < HEAD_POSE_THRESHOLD
    }

    private fun checkNaturalExpression(face: Face): Boolean {
        val smilingProbability = face.smilingProbability
        return smilingProbability == null || smilingProbability < SMILE_THRESHOLD
    }

    private fun createLivenessResponse(result: LivenessResult, faceCount: Int): JSObject {
        return JSObject().apply {
            put("isLive", result.isLive)
            put("confidence", result.confidence)
            put("faceDetected", result.faceDetected)
            put("eyesOpen", result.eyesOpen)
            put("headPose", result.headPose)
            put("faceCount", faceCount)
            put("details", result.details)
            put("timestamp", System.currentTimeMillis())
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        pluginScope.cancel()
    }

    private data class LivenessResult(
        var isLive: Boolean = false,
        var faceDetected: Boolean = false,
        var eyesOpen: Boolean = false,
        var headPose: Boolean = false,
        var confidence: Float = 0.0f,
        var details: String = ""
    )
}