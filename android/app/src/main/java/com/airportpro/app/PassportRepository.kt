package com.airportpro.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.nfc.tech.IsoDep
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.sf.scuba.data.Gender
import org.bouncycastle.asn1.ASN1InputStream
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.iso19794.FaceImageInfo
import java.io.ByteArrayInputStream
import java.io.DataInputStream
import java.io.InputStream
import java.security.MessageDigest
import java.util.*
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Handles all low-level communication with the e-passport.
 * This class is responsible for the cryptographic handshake (BAC),
 * secure messaging, and reading/parsing of data groups using the JMRTD library.
 */
class PassportRepository {

    // --- Session Cryptography State ---
    private lateinit var kEnc: SecretKeySpec // Key for encryption/decryption
    private lateinit var kMac: SecretKeySpec // Key for Message Authentication Code
    private var ssc: Long = 0L // Send Sequence Counter for secure messaging

    companion object {
        private const val TAG = "PassportRepository"
    }

    /**
     * The main public method to read passport data.
     */
    suspend fun readPassport(isoDep: IsoDep, mrzInfo: MrzInfo): PassportDetails = withContext(Dispatchers.IO) {
        try {
            isoDep.timeout = 10000 // Increase timeout for potentially slow chips
            if (!isoDep.isConnected) {
                isoDep.connect()
            }

            Log.d(TAG, "Step 1: Deriving BAC keys.")
            deriveBacKeys(mrzInfo)

            Log.d(TAG, "Step 2: Performing Basic Access Control (BAC).")
            performBac(isoDep)

            Log.d(TAG, "Step 3: Reading Data Group 1 (DG1 - MRZ).")
            val dg1Data = readDataGroup(isoDep, DgTag.DG1)
            val parsedMrz = parseDg1(dg1Data)

            Log.d(TAG, "Step 4: Reading Data Group 2 (DG2 - Facial Image).")
            val dg2Data = readDataGroup(isoDep, DgTag.DG2)
            val image = decodeDg2(dg2Data)

            Log.d(TAG, "Successfully read and parsed passport data.")
            PassportDetails(mrz = parsedMrz, photo = image)
        } finally {
            if (isoDep.isConnected) {
                isoDep.close()
            }
        }
    }

    // --- Core Logic Implementation ---

    private fun deriveBacKeys(mrzInfo: MrzInfo) {
        val mrzString = (mrzInfo.passportNumber.padEnd(9, '<') + mrzInfo.dateOfBirth + mrzInfo.dateOfExpiry)
        val sha1 = MessageDigest.getInstance("SHA-1")
        val mrzHash = sha1.digest(mrzString.toByteArray(Charsets.UTF_8))

        val keySeed = mrzHash.copyOfRange(0, 16)
        val kEncSeed = sha1.digest(keySeed + byteArrayOf(0, 0, 0, 1))
        val kMacSeed = sha1.digest(keySeed + byteArrayOf(0, 0, 0, 2))

        kEnc = SecretKeySpec(kEncSeed.copyOfRange(0, 16), "DESede")
        kMac = SecretKeySpec(kMacSeed.copyOfRange(0, 16), "DESede")
    }

    private fun performBac(isoDep: IsoDep) {
        val getChallengeCommand = APDUCommand(0x00.toByte(), 0x84.toByte(), 0x00.toByte(), 0x00.toByte(), byteArrayOf(), 8)
        val challengeResponse = isoDep.transceive(getChallengeCommand.toByteArray())
        val rndIcc = challengeResponse.copyOfRange(0, 8)

        val rndIfd = ByteArray(8).apply { Random().nextBytes(this) }
        val kIfd = ByteArray(16).apply { Random().nextBytes(this) }

        val s = rndIfd + rndIcc + kIfd
        val eIfd = encrypt(kEnc, s, "DESede/CBC/NoPadding")
        val mIfd = calculateMac(kMac, eIfd)

        val mutualAuthCommand = APDUCommand(0x00.toByte(), 0x82.toByte(), 0x00.toByte(), 0x00.toByte(), eIfd + mIfd, 40)
        val mutualAuthResponse = isoDep.transceive(mutualAuthCommand.toByteArray())
        if (mutualAuthResponse.last().toInt() != 0x00 || mutualAuthResponse[mutualAuthResponse.size - 2].toInt() != 0x90) {
            throw Exception("Mutual authentication failed. SW is not 9000.")
        }

        val r = mutualAuthResponse.copyOfRange(0, 32)
        val data = decrypt(kEnc, r, "DESede/CBC/NoPadding")

        val receivedRndIfd = data.copyOfRange(0, 8)
        if (!rndIfd.contentEquals(receivedRndIfd)) {
            throw SecurityException("BAC failed: RND.IFD mismatch")
        }

        val kSeed = xor(kIfd, data.copyOfRange(16, 32))
        val sha1 = MessageDigest.getInstance("SHA-1")
        val ksEncSeed = sha1.digest(kSeed + byteArrayOf(0, 0, 0, 1))
        val ksMacSeed = sha1.digest(kSeed + byteArrayOf(0, 0, 0, 2))

        kEnc = SecretKeySpec(ksEncSeed.copyOfRange(0, 16), "DESede")
        kMac = SecretKeySpec(ksMacSeed.copyOfRange(0, 16), "DESede")
        ssc = (data.copyOfRange(8, 12).toLong() shl 32) or data.copyOfRange(12, 16).toLong()
    }

    private fun readDataGroup(isoDep: IsoDep, dgTag: DgTag): ByteArray {
        val selectCommand = APDUCommand(0x0C.toByte(), 0xA4.toByte(), 0x02.toByte(), 0x0C.toByte(), dgTag.tag, 0)
        isoDep.transceive(protect(selectCommand).toByteArray())

        val readHeaderCommand = APDUCommand(0x0C.toByte(), 0xB0.toByte(), 0x00.toByte(), 0x00.toByte(), byteArrayOf(), 4)
        val headerResponse = isoDep.transceive(protect(readHeaderCommand).toByteArray())
        val decryptedHeader = unprotect(headerResponse)

        val asn1Stream = ASN1InputStream(ByteArrayInputStream(decryptedHeader))
        asn1Stream.readObject()
        val lengthBytes = asn1Stream.readObject().encoded
        val length = parseLength(lengthBytes)

        val fileData = ByteArray(length)
        var offset = 0
        while (offset < length) {
            val bytesToRead = minOf(224, length - offset)
            val readChunkCommand = APDUCommand(0x0C.toByte(), 0xB0.toByte(), (offset shr 8).toByte(), offset.toByte(), byteArrayOf(), bytesToRead)
            val chunkResponse = isoDep.transceive(protect(readChunkCommand).toByteArray())
            val decryptedChunk = unprotect(chunkResponse)

            System.arraycopy(decryptedChunk, 0, fileData, offset, decryptedChunk.size)
            offset += decryptedChunk.size
        }
        return fileData
    }

    /**
     * Parses DG1 using the JMRTD library for robust results.
     */
    private fun parseDg1(data: ByteArray): String {
        return try {
            val dg1File = DG1File(ByteArrayInputStream(data))
            val mrzInfo = dg1File.mrzInfo

            // The mrzInfo.gender is already a Gender enum, no conversion needed.
            // Its toString() method will be called automatically in the string template.
            """
            Name: ${mrzInfo.secondaryIdentifier.replace("<", " ").trim()}
            Surname: ${mrzInfo.primaryIdentifier.replace("<", " ").trim()}
            Doc No: ${mrzInfo.documentNumber}
            Nationality: ${mrzInfo.nationality}
            DoB: ${mrzInfo.dateOfBirth}
            Gender: ${mrzInfo.gender}
            """.trimIndent()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse DG1", e)
            "Failed to parse DG1: ${e.message}"
        }
    }

    /**
     * Decodes the DG2 file using the JMRTD library.
     */
    private fun decodeDg2(data: ByteArray): Bitmap? {
        return try {
            val dg2File = DG2File(ByteArrayInputStream(data))
            val faceInfos = dg2File.faceInfos
            if (faceInfos.isEmpty()) return null

            val faceInfo = faceInfos.first()
            val imageInfos: List<FaceImageInfo> = faceInfo.faceImageInfos
            if (imageInfos.isEmpty()) return null

            val imageInfo = imageInfos.first()
            val imageStream: InputStream = imageInfo.imageInputStream
            val length = imageInfo.imageLength

            val dataInputStream = DataInputStream(imageStream)
            val buffer = ByteArray(length)
            dataInputStream.readFully(buffer, 0, length)
            BitmapFactory.decodeStream(ByteArrayInputStream(buffer))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode DG2", e)
            null
        }
    }

    // --- Secure Messaging & Cryptography Helpers ---

    private fun protect(command: APDUCommand): APDUCommand {
        ssc++
        val paddedSsc = ssc.toByteArray().pad(8)

        val commandHeader = command.toHeaderBytes()
        val do87 = if (command.data.isNotEmpty()) {
            val paddedData = command.data.pad(8, 0x80.toByte())
            val encryptedData = encrypt(kEnc, paddedData, "DESede/CBC/NoPadding", paddedSsc)
            val dataLength = encryptedData.size.toByteArray()
            byteArrayOf(0x87.toByte()) + dataLength + encryptedData
        } else byteArrayOf()

        val do97 = if (command.le > 0) byteArrayOf(0x97.toByte(), 0x01.toByte(), command.le.toByte()) else byteArrayOf()

        val macData = (paddedSsc + commandHeader + do87 + do97).pad(8)
        val mac = calculateMac(kMac, macData).copyOfRange(0, 8)
        val do8e = byteArrayOf(0x8E.toByte(), 0x08.toByte()) + mac

        return command.copy(data = do87 + do97 + do8e)
    }

    private fun unprotect(response: ByteArray): ByteArray {
        ssc++
        val paddedSsc = ssc.toByteArray().pad(8)

        val do87 = findTag(byteArrayOf(0x87.toByte()), response)
        val do99 = findTag(byteArrayOf(0x99.toByte()), response)
        val do8e = findTag(byteArrayOf(0x8E.toByte()), response)

        val macData = (paddedSsc + (do87 ?: byteArrayOf()) + (do99 ?: byteArrayOf())).pad(8)
        val calculatedMac = calculateMac(kMac, macData).copyOfRange(0, 8)

        if (do8e == null || !do8e.contentEquals(calculatedMac)) {
            throw SecurityException("MAC verification failed on response.")
        }

        return if (do87 != null) {
            val encryptedData = do87.copyOfRange(if (do87.getOrElse(1) { 0 } == 0x81.toByte()) 3 else 2, do87.size)
            decrypt(kEnc, encryptedData, "DESede/CBC/NoPadding", paddedSsc).unpad()
        } else {
            byteArrayOf()
        }
    }

    private fun encrypt(key: SecretKeySpec, data: ByteArray, algorithm: String, iv: ByteArray = ByteArray(8)): ByteArray {
        val cipher = Cipher.getInstance(algorithm)
        cipher.init(Cipher.ENCRYPT_MODE, key, IvParameterSpec(iv))
        return cipher.doFinal(data)
    }

    private fun decrypt(key: SecretKeySpec, data: ByteArray, algorithm: String, iv: ByteArray = ByteArray(8)): ByteArray {
        val cipher = Cipher.getInstance(algorithm)
        cipher.init(Cipher.DECRYPT_MODE, key, IvParameterSpec(iv))
        return cipher.doFinal(data)
    }

    private fun calculateMac(key: SecretKeySpec, data: ByteArray): ByteArray {
        val mac = Mac.getInstance("ISO9797Alg3Mac", "BC")
        mac.init(key)
        return mac.doFinal(data)
    }

    // --- Utility & Extension Functions ---

    private fun xor(a: ByteArray, b: ByteArray): ByteArray = a.zip(b).map { (x, y) -> (x.toInt() xor y.toInt()).toByte() }.toByteArray()

    private fun findTag(tag: ByteArray, data: ByteArray): ByteArray? {
        for (i in 0..data.size - tag.size) {
            if (data.copyOfRange(i, i + tag.size).contentEquals(tag)) {
                val len: Int
                val lenOffset: Int
                if (data.size > i + tag.size && data[i + tag.size] == 0x81.toByte()) {
                    len = data.getOrElse(i + tag.size + 1) { 0 }.toInt() and 0xFF
                    lenOffset = 2
                } else if (data.size > i + tag.size) {
                    len = data[i + tag.size].toInt() and 0xFF
                    lenOffset = 1
                } else {
                    continue
                }
                val start = i + tag.size
                val end = start + lenOffset + len
                if (end > data.size) continue
                return data.copyOfRange(start, end)
            }
        }
        return null
    }

    private fun parseLength(bytes: ByteArray): Int {
        if (bytes.isEmpty()) return 0
        if (bytes[0] == 0x81.toByte()) {
            return bytes.getOrElse(1) { 0 }.toInt() and 0xFF
        }
        if (bytes[0] == 0x82.toByte()) {
            val high = bytes.getOrElse(1) { 0 }.toInt() and 0xFF
            val low = bytes.getOrElse(2) { 0 }.toInt() and 0xFF
            return (high shl 8) or low
        }
        return bytes[0].toInt() and 0xFF
    }

    private operator fun ByteArray.plus(other: ByteArray): ByteArray {
        val result = ByteArray(this.size + other.size)
        System.arraycopy(this, 0, result, 0, this.size)
        System.arraycopy(other, 0, result, this.size, other.size)
        return result
    }

    private fun ByteArray.pad(blockSize: Int, padByte: Byte = 0x00.toByte()): ByteArray {
        val remainder = this.size % blockSize
        if (remainder == 0) return this
        val paddingSize = blockSize - remainder
        val padding = ByteArray(paddingSize)
        if (padByte != 0x00.toByte()) {
            padding[0] = padByte
        }
        return this + padding
    }

    private fun ByteArray.unpad(): ByteArray {
        val lastIndex = this.indexOfLast { it != 0x00.toByte() }
        if (lastIndex < 0) return this
        return if (this[lastIndex] == 0x80.toByte()) {
            this.copyOfRange(0, lastIndex)
        } else {
            this
        }
    }

    private fun Long.toByteArray(): ByteArray = byteArrayOf(
        (this shr 56).toByte(), (this shr 48).toByte(), (this shr 40).toByte(), (this shr 32).toByte(),
        (this shr 24).toByte(), (this shr 16).toByte(), (this shr 8).toByte(), this.toByte()
    )

    private fun ByteArray.toLong(): Long {
        var value = 0L
        for (byte in this) {
            value = (value shl 8) + (byte.toLong() and 0xff)
        }
        return value
    }

    private fun Int.toByteArray(): ByteArray {
        if (this < 128) {
            return byteArrayOf(this.toByte())
        }
        return byteArrayOf(0x81.toByte(), this.toByte())
    }


    private data class APDUCommand(val cla: Byte, val ins: Byte, val p1: Byte, val p2: Byte, val data: ByteArray, val le: Int) {
        fun toByteArray(): ByteArray {
            val dataLen = if (data.isNotEmpty()) byteArrayOf(data.size.toByte()) else byteArrayOf()
            val leByte = if (le > 0) byteArrayOf(le.toByte()) else byteArrayOf()
            return byteArrayOf(cla, ins, p1, p2) + dataLen + data + leByte
        }

        fun toHeaderBytes(): ByteArray = byteArrayOf(cla, ins, p1, p2, data.size.toByte())

        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false

            other as APDUCommand

            if (cla != other.cla) return false
            if (ins != other.ins) return false
            if (p1 != other.p1) return false
            if (p2 != other.p2) return false
            if (!data.contentEquals(other.data)) return false
            if (le != other.le) return false

            return true
        }

        override fun hashCode(): Int {
            var result = cla.toInt()
            result = 31 * result + ins.toInt()
            result = 31 * result + p1.toInt()
            result = 31 * result + p2.toInt()
            result = 31 * result + data.contentHashCode()
            result = 31 * result + le
            return result
        }
    }

    private enum class DgTag(val tag: ByteArray) {
        DG1(byteArrayOf(0x01.toByte(), 0x01.toByte())),
        DG2(byteArrayOf(0x01.toByte(), 0x02.toByte()))
    }
}