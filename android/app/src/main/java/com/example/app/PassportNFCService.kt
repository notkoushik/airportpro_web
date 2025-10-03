package com.airportpro.app

import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import java.io.IOException

class PassportNFCService {
    companion object {
        private const val TAG = "PassportNFC"

        // Basic passport detection
        private val SELECT_APPLET = byteArrayOf(
            0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(),
            0x07.toByte(), 0xA0.toByte(), 0x00.toByte(), 0x00.toByte(),
            0x02.toByte(), 0x47.toByte(), 0x10.toByte(), 0x01.toByte()
        )
    }

    data class BasicPassportInfo(
        val isPassportDetected: Boolean,
        val chipId: String?,
        val errorMessage: String?
    )

    fun detectPassport(tag: Tag): BasicPassportInfo {
        val isoDep = IsoDep.get(tag) ?: return BasicPassportInfo(
            false, null, "IsoDep not supported"
        )

        try {
            isoDep.connect()
            Log.d(TAG, "Connected to passport chip")

            // Try to select passport application
            val response = isoDep.transceive(SELECT_APPLET)
            val success = response.size >= 2 &&
                    response[response.size - 2] == 0x90.toByte() &&
                    response[response.size - 1] == 0x00.toByte()

            isoDep.close()

            return if (success) {
                BasicPassportInfo(
                    true,
                    tag.id.joinToString("") { "%02x".format(it) },
                    null
                )
            } else {
                BasicPassportInfo(false, null, "Passport application not found")
            }

        } catch (e: IOException) {
            Log.e(TAG, "NFC communication failed: ${e.message}")
            return BasicPassportInfo(false, null, e.message)
        }
    }
}
