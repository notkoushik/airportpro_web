@CapacitorPlugin(name = "NFCPassportReader")
class NFCPassportReaderPlugin : Plugin() {
    
    private val passportRepository = PassportRepository()
    private var nfcAdapter: NfcAdapter? = null
    
    @PluginMethod
    fun readPassport(call: PluginCall) {
        val passportNumber = call.getString("passportNumber") ?: return call.reject("Missing passport number")
        val dateOfBirth = call.getString("dateOfBirth") ?: return call.reject("Missing date of birth")
        val dateOfExpiry = call.getString("dateOfExpiry") ?: return call.reject("Missing expiry date")
        
        val mrzInfo = MrzInfo(passportNumber, dateOfBirth, dateOfExpiry)
        enableNFCReaderMode(call, mrzInfo)
    }
    
    private fun enableNFCReaderMode(call: PluginCall, mrzInfo: MrzInfo) {
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        
        nfcAdapter?.enableReaderMode(
            activity,
            { tag -> handleNFCTag(tag, mrzInfo, call) },
            NfcAdapter.FLAG_READER_NFC_A,
            null
        )
    }
    
    private fun handleNFCTag(tag: Tag, mrzInfo: MrzInfo, call: PluginCall) {
        val isoDep = IsoDep.get(tag)
        GlobalScope.launch {
            try {
                val passportDetails = passportRepository.readPassport(isoDep, mrzInfo)
                call.resolve(JSObject().apply {
                    put("success", true)
                    put("mrz", passportDetails.mrz)
                    put("photo", bitmapToBase64(passportDetails.photo))
                    put("verified", true)
                })
            } catch (e: Exception) {
                call.reject("NFC read failed: ${e.message}")
            }
        }
    }
}
