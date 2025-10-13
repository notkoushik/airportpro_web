package com.airportpro.app

import android.graphics.Bitmap

data class MrzInfo(
    val passportNumber: String,
    val dateOfBirth: String,
    val dateOfExpiry: String
)

data class PassportData(
    val documentNumber: String,
    val firstName: String,
    val lastName: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
    val nationality: String
)

data class PassportDetails(
    val mrz: String,
    val photo: Bitmap?
)

sealed class UIState {
    object Idle : UIState()
    object Loading : UIState()
    data class Success(val data: PassportDetails) : UIState()
    data class Error(val message: String) : UIState()
}
