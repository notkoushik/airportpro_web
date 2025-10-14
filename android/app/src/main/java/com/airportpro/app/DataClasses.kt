package com.airportpro.app

data class PassportData(
    val documentNumber: String,
    val firstName: String,
    val lastName: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
    val nationality: String,
    val photo: String? = null
)

data class LivenessResult(
    val isLive: Boolean,
    val confidence: Float,
    val photo: String? = null
)

data class NFCResult(
    val success: Boolean,
    val mrz: String? = null,
    val photo: String? = null,
    val verified: Boolean = false
)
