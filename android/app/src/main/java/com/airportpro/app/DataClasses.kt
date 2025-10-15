package com.airportpro.app.models

import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.MutableStateFlow

// FIXED: Added missing UIState sealed class
sealed class UIState {
    object Idle : UIState()
    object Loading : UIState()
    data class Success(val data: Any) : UIState()
    data class Error(val message: String) : UIState()
}

// FIXED: Added missing MrzInfo data class
data class MrzInfo(
    val documentNumber: String,
    val documentType: String,
    val issuingCountry: String,
    val surname: String,
    val givenNames: String,
    val nationality: String,
    val birthDate: String,
    val gender: String,
    val expiryDate: String,
    val personalNumber: String = ""
)

// FIXED: Added missing PassportDetails data class  
data class PassportDetails(
    val mrz: MrzInfo,
    val photo: String? = null, // Base64 encoded photo
    val digitalSignatureValid: Boolean = false,
    val dataAuthenticity: String = "UNKNOWN",
    val biometricData: BiometricData? = null
)

// Additional data classes
data class BiometricData(
    val faceImageAvailable: Boolean = false,
    val faceImage: String? = null, // Base64 encoded
    val fingerprintAvailable: Boolean = false,
    val irisAvailable: Boolean = false
)

data class LivenessResult(
    val isLive: Boolean,
    val confidence: Double,
    val passedChecks: Int,
    val totalChecks: Int,
    val reason: String,
    val checks: LivenessChecks
)

data class LivenessChecks(
    val leftEyeOpen: Boolean,
    val rightEyeOpen: Boolean,
    val headPoseOk: Boolean,
    val naturalExpression: Boolean,
    val faceSizeOk: Boolean,
    val leftEyeProb: Float,
    val rightEyeProb: Float,
    val smileProb: Float,
    val headPoseX: Float,
    val headPoseY: Float,
    val headPoseZ: Float,
    val faceSize: Int
)

// Repository interface
interface PassportRepository {
    suspend fun readPassport(isoDep: android.nfc.tech.IsoDep, mrzInfo: MrzInfo): PassportDetails
}

// ViewModel class
class PassportViewModel {
    private val _uiState = MutableStateFlow<UIState>(UIState.Idle)
    val uiState: StateFlow<UIState> = _uiState

    fun readPassport(isoDep: android.nfc.tech.IsoDep, mrzInfo: MrzInfo) {
        androidx.lifecycle.viewModelScope.launch {
            _uiState.value = UIState.Loading
            try {
                // val passportDetails = repository.readPassport(isoDep, mrzInfo)
                // _uiState.value = UIState.Success(passportDetails)
                _uiState.value = UIState.Error("Not implemented yet")
            } catch (e: Exception) {
                _uiState.value = UIState.Error(e.message ?: "An unknown error occurred")
            }
        }
    }

    fun clearState() {
        _uiState.value = UIState.Idle
    }
}