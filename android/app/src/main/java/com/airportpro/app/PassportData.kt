package com.airportpro.app


import android.graphics.Bitmap

// Holds the information needed to start the reading process
data class MrzInfo(
    val passportNumber: String,
    val dateOfBirth: String, // YYMMDD
    val dateOfExpiry: String // YYMMDD
)

// Holds the final, successfully parsed passport details
data class PassportDetails(
    val mrz: String,
    val photo: Bitmap?
)

// Represents the different states our UI can be in
sealed class UIState {
    data object Idle : UIState()
    data object Loading : UIState()
    data class Success(val passportDetails: PassportDetails) : UIState()
    data class Error(val message: String) : UIState()
}