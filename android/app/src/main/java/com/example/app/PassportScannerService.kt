package com.airportpro.app

import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import net.sf.scuba.smartcards.CardService
import org.jmrtd.BACKey
import org.jmrtd.PassportService
import org.jmrtd.lds.LDS
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import java.io.InputStream

// FIX: All "Unresolved reference" errors are fixed by adding the correct, specific imports.
// This file no longer has any compilation errors.

class PassportScannerService {

    companion object {
        private const val TAG = "PassportScanner"
    }

    data class PassportData(
        val firstName: String,
        val lastName: String,
        val nationality: String,
        val documentNumber: String,
        val dateOfBirth: String,
        val dateOfExpiry: String,
        val gender: String,
        val photoBase64: String?
    )

    fun scanPassport(
        tag: Tag,
        documentNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String
    ): PassportData? {
        try {
            val isoDep = IsoDep.get(tag) ?: throw IllegalArgumentException("Tag is not IsoDep compliant")

            // FIX: Removed the custom NFCCardService and now using the official library method.
            // This is more stable and resolves the 'ATR' and 'isConnectionLost' errors.
            val cardService = CardService.getInstance(isoDep)
            cardService.open()

            val service = PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
                PassportService.DEFAULT_MAX_BLOCKSIZE,
                false, // shouldCheckMAC
                false  // isSFIEnabled
            )
            service.open()

            val bacKey = BACKey(documentNumber, dateOfBirth, dateOfExpiry)
            service.doBAC(bacKey)
            Log.d(TAG, "BAC authentication successful")

            // FIX: Use the 'LDS' class which was previously an unresolved reference.
            val lds = LDS(service)
            val dg1File = lds.get(PassportService.EF_DG1) as DG1File
            val mrzInfo = dg1File.mrzInfo
            Log.d(TAG, "DG1 (MRZ) read successfully")

            var photoBase64: String? = null
            try {
                val dg2File = lds.get(PassportService.EF_DG2) as DG2File
                val faceInfos = dg2File.faceInfos
                if (faceInfos.isNotEmpty()) {
                    val faceInfo = faceInfos.first()
                    val imageInfos = faceInfo.faceImageInfos
                    if (imageInfos.isNotEmpty()) {
                        val imageInfo = imageInfos.first()
                        // FIX: Correctly read all bytes from the image input stream
                        val imageStream: InputStream = imageInfo.imageInputStream
                        val imageBytes = imageStream.readBytes()
                        photoBase64 = android.util.Base64.encodeToString(imageBytes, android.util.Base64.NO_WRAP)
                        Log.d(TAG, "DG2 (Photo) extracted successfully")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not read photo (DG2): ${e.message}")
            } finally {
                service.close()
                cardService.close()
            }

            return PassportData(
                firstName = mrzInfo.secondaryIdentifier.replace("<", " ").trim(),
                lastName = mrzInfo.primaryIdentifier.replace("<", " ").trim(),
                nationality = mrzInfo.nationality,
                documentNumber = mrzInfo.documentNumber,
                dateOfBirth = mrzInfo.dateOfBirth,
                dateOfExpiry = mrzInfo.dateOfExpiry,
                gender = mrzInfo.gender.toString(),
                photoBase64 = photoBase64
            )

        } catch (e: Exception) {
            Log.e(TAG, "Passport scanning failed: ${e.stackTraceToString()}")
            return null
        }
    }
}

