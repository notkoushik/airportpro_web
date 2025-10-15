package com.airportpro.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject

// Fixed imports for ML Kit
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions

@CapacitorPlugin(name = "LivenessPlugin")
class LivenessPlugin : Plugin() {
    
    private lateinit var detector: FaceDetector

    override fun load() {
        super.load()
        
        // Initialize face detector with optimal settings
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .build()

        detector = FaceDetection.getClient(options)
    }

    @PluginMethod
    fun detectLiveness(call: PluginCall) {
        val base64Image = call.getString("imageData")
        if (base64Image == null) {
            call.reject("Missing image data")
            return
        }

        try {
            // Decode base64 image
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            
            if (bitmap == null) {
                call.reject("Failed to decode image")
                return
            }

            val image = InputImage.fromBitmap(bitmap, 0)
            
            processLivenessDetection(image, call)

        } catch (e: Exception) {
            call.reject("Error processing liveness detection: ${e.message}")
        }
    }

    private fun processLivenessDetection(image: InputImage, call: PluginCall) {
        detector.process(image)
            .addOnSuccessListener { faces ->
                val result = analyzeFacesForLiveness(faces)
                call.resolve(result)
            }
            .addOnFailureListener { e ->
                call.reject("Face detection failed: ${e.message}")
            }
    }

    private fun analyzeFacesForLiveness(faces: List<Face>): JSObject {
        val result = JSObject()
        
        if (faces.isEmpty()) {
            result.put("isLive", false)
            result.put("confidence", 0.0)
            result.put("reason", "No face detected")
            return result
        }

        // Get the primary face (largest one)
        val primaryFace = faces.maxByOrNull { face ->
            val bounds = face.boundingBox
            bounds.width() * bounds.height()
        }

        if (primaryFace == null) {
            result.put("isLive", false)
            result.put("confidence", 0.0)
            result.put("reason", "Could not analyze primary face")
            return result
        }

        return analyzePrimaryFace(primaryFace)
    }

    private fun analyzePrimaryFace(face: Face): JSObject {
        val result = JSObject()
        val checks = JSObject()
        
        // Check 1: Eye openness
        val (leftEyeOpen, leftEyeProb) = checkEyeOpenness(face, true)
        val (rightEyeOpen, rightEyeProb) = checkEyeOpenness(face, false)
        checks.put("leftEyeOpen", leftEyeOpen)
        checks.put("rightEyeOpen", rightEyeOpen)
        checks.put("leftEyeProb", leftEyeProb)
        checks.put("rightEyeProb", rightEyeProb)

        // Check 2: Head pose
        val headPoseOk = checkHeadPose(face)
        checks.put("headPoseOk", headPoseOk)
        checks.put("headPoseX", face.headEulerAngleX)
        checks.put("headPoseY", face.headEulerAngleY)
        checks.put("headPoseZ", face.headEulerAngleZ)

        // Check 3: Natural expression (smile probability)
        val naturalExpression = checkNaturalExpression(face)
        checks.put("naturalExpression", naturalExpression)
        
        val smileProb = face.smilingProbability ?: 0f
        checks.put("smileProb", smileProb)

        // Check 4: Face size (quality check)
        val bounds = face.boundingBox
        val faceSize = bounds.width() * bounds.height()
        val faceSizeOk = faceSize > 30000 // Minimum face size
        checks.put("faceSizeOk", faceSizeOk)
        checks.put("faceSize", faceSize)

        // Calculate overall confidence
        var confidence = 0.0
        var passedChecks = 0
        val totalChecks = 5

        if (leftEyeOpen && rightEyeOpen) {
            confidence += 0.30
            passedChecks++
        }
        if (headPoseOk) {
            confidence += 0.20
            passedChecks++
        }
        if (naturalExpression) {
            confidence += 0.15
            passedChecks++
        }
        if (faceSizeOk) {
            confidence += 0.20
            passedChecks++
        }
        // Additional quality bonus
        if (face.trackingId != null) {
            confidence += 0.15
            passedChecks++
        }

        val isLive = confidence >= 0.60 // 60% minimum threshold
        
        result.put("isLive", isLive)
        result.put("confidence", confidence)
        result.put("passedChecks", passedChecks)
        result.put("totalChecks", totalChecks)
        result.put("checks", checks)
        result.put("reason", if (isLive) "Liveness confirmed" else "Liveness check failed")

        return result
    }

    private fun checkEyeOpenness(face: Face, isLeft: Boolean): Pair<Boolean, Float> {
        val eyeProb = if (isLeft) {
            face.leftEyeOpenProbability ?: 0f
        } else {
            face.rightEyeOpenProbability ?: 0f
        }
        
        val isOpen = eyeProb > 0.3f // 30% threshold
        return Pair(isOpen, eyeProb)
    }

    private fun checkHeadPose(face: Face): Boolean {
        val rotX = Math.abs(face.headEulerAngleX)
        val rotY = Math.abs(face.headEulerAngleY)
        val rotZ = Math.abs(face.headEulerAngleZ)
        
        // Allow up to 20 degrees rotation in any direction
        return rotX < 20 && rotY < 20 && rotZ < 20
    }

    private fun checkNaturalExpression(face: Face): Boolean {
        val smileProb = face.smilingProbability ?: 0f
        // Natural expression: not too much smiling (could indicate fake photo)
        return smileProb < 0.8f
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        if (this::detector.isInitialized) {
            // Detector will be garbage collected automatically
        }
    }
}