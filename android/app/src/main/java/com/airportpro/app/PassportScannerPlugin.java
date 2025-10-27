package com.airportpro.app;

import android.Manifest;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.media.ExifInterface;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import org.json.JSONException;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;  // Add this if missing
import java.util.Comparator;   // Add this if missing
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;


@CapacitorPlugin(
    name = "PassportScanner",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class PassportScannerPlugin extends Plugin {
    private static final String TAG = "PassportScanner";
    private TextRecognizer textRecognizer;
    private ExecutorService cameraExecutor;
    
    // Character substitution map for common OCR errors
    private static final Map<Character, Character> OCR_CORRECTIONS = new HashMap<>();
    static {
        OCR_CORRECTIONS.put('O', '0');
        OCR_CORRECTIONS.put('I', '1');
        OCR_CORRECTIONS.put('l', '1');
        OCR_CORRECTIONS.put('S', '5');
        OCR_CORRECTIONS.put('Z', '2');
        OCR_CORRECTIONS.put('B', '8');
    }
    
    @Override
    public void load() {
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        cameraExecutor = Executors.newSingleThreadExecutor();
        Log.d(TAG, "PassportScanner Plugin loaded successfully");
    }
    
    @PluginMethod
    public void scanPassport(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "cameraPermissionCallback");
            return;
        }
        call.reject("Use @capacitor/camera to capture image, then call scanFromImage()");
    }
    
    @PluginMethod
    public void scanFromImage(PluginCall call) {
        String imagePath = call.getString("imagePath");
        
        if (imagePath == null || imagePath.isEmpty()) {
            call.reject("Image path is required");
            return;
        }
        
        try {
            String cleanPath = imagePath.replace("file://", "");
            File imageFile = new File(cleanPath);
            
            if (!imageFile.exists()) {
                call.reject("Image file not found at: " + cleanPath);
                return;
            }
            
            Bitmap originalBitmap = BitmapFactory.decodeFile(cleanPath);
            if (originalBitmap == null) {
                call.reject("Failed to decode image");
                return;
            }
            
            Bitmap processedBitmap = preprocessImage(originalBitmap, cleanPath);
            int rotation = getImageRotation(cleanPath);
            InputImage image = InputImage.fromBitmap(processedBitmap, rotation);
            
            textRecognizer.process(image)
                .addOnSuccessListener(new OnSuccessListener<Text>() {
                    @Override
                    public void onSuccess(Text visionText) {
                        JSObject result = processMRZText(visionText);
                        call.resolve(result);
                        
                        if (processedBitmap != originalBitmap) {
                            processedBitmap.recycle();
                        }
                        originalBitmap.recycle();
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        call.reject("OCR processing failed: " + e.getMessage());
                        if (processedBitmap != originalBitmap) {
                            processedBitmap.recycle();
                        }
                        originalBitmap.recycle();
                    }
                });
                
        } catch (Exception e) {
            call.reject("Error processing image: " + e.getMessage());
            Log.e(TAG, "Image processing error", e);
        }
    }
    
    @PluginMethod
    public void checkModelsReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", textRecognizer != null);
        call.resolve(result);
    }
    
    private Bitmap preprocessImage(Bitmap original, String imagePath) {
        try {
            Bitmap resized = ensureMinimumResolution(original);
            Bitmap grayscale = toGrayscale(resized);
            if (grayscale != resized && resized != original) {
                resized.recycle();
            }
            
            Bitmap enhanced = enhanceContrast(grayscale);
            if (enhanced != grayscale) {
                grayscale.recycle();
            }
            
            return enhanced;
        } catch (Exception e) {
            Log.e(TAG, "Preprocessing failed, using original", e);
            return original;
        }
    }
    
    private Bitmap ensureMinimumResolution(Bitmap bitmap) {
        final int MIN_WIDTH = 1800;
        
        if (bitmap.getWidth() < MIN_WIDTH) {
            float scale = (float) MIN_WIDTH / bitmap.getWidth();
            int newHeight = (int) (bitmap.getHeight() * scale);
            return Bitmap.createScaledBitmap(bitmap, MIN_WIDTH, newHeight, true);
        }
        return bitmap;
    }
    
    private Bitmap toGrayscale(Bitmap bitmap) {
        Bitmap grayscale = Bitmap.createBitmap(bitmap.getWidth(), bitmap.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(grayscale);
        Paint paint = new Paint();
        
        ColorMatrix colorMatrix = new ColorMatrix();
        colorMatrix.setSaturation(0);
        ColorMatrixColorFilter filter = new ColorMatrixColorFilter(colorMatrix);
        paint.setColorFilter(filter);
        
        canvas.drawBitmap(bitmap, 0, 0, paint);
        return grayscale;
    }
    
    private Bitmap enhanceContrast(Bitmap bitmap) {
        Bitmap enhanced = Bitmap.createBitmap(bitmap.getWidth(), bitmap.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(enhanced);
        Paint paint = new Paint();
        
        ColorMatrix colorMatrix = new ColorMatrix(new float[] {
            1.5f, 0, 0, 0, -50,
            0, 1.5f, 0, 0, -50,
            0, 0, 1.5f, 0, -50,
            0, 0, 0, 1, 0
        });
        
        paint.setColorFilter(new ColorMatrixColorFilter(colorMatrix));
        canvas.drawBitmap(bitmap, 0, 0, paint);
        return enhanced;
    }
    
    private int getImageRotation(String imagePath) {
        try {
            ExifInterface exif = new ExifInterface(imagePath);
            int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            
            switch (orientation) {
                case ExifInterface.ORIENTATION_ROTATE_90:
                    return 90;
                case ExifInterface.ORIENTATION_ROTATE_180:
                    return 180;
                case ExifInterface.ORIENTATION_ROTATE_270:
                    return 270;
                default:
                    return 0;
            }
        } catch (IOException e) {
            Log.e(TAG, "Failed to read EXIF", e);
            return 0;
        }
    }
    
    private JSObject processMRZText(Text visionText) {
        JSObject result = new JSObject();
        
        try {
            List<String> mrzLines = extractMRZLines(visionText);
            
            if (mrzLines.size() >= 2) {
                JSObject passportData = parseMRZ(mrzLines);
                
                if (passportData.has("documentNumber") && !passportData.getString("documentNumber").isEmpty()) {
                    result.put("success", true);
                    result.put("data", passportData);
                    result.put("confidence", 0.95);
                } else {
                    result.put("success", false);
                    result.put("error", "Could not parse MRZ data - document number missing");
                }
            } else {
                result.put("success", false);
                result.put("error", "MRZ not detected. Found " + mrzLines.size() + " lines. Please ensure passport is clearly visible.");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Processing error: " + e.getMessage());
            Log.e(TAG, "MRZ processing error", e);
        }
        
        return result;
    }
    
    private List<String> extractMRZLines(Text visionText) {
    List<String> mrzLines = new ArrayList<>();
    Pattern mrzPattern = Pattern.compile("^[A-Z0-9<]+$");
    Map<Float, String> linesByY = new HashMap<>();
    
    for (Text.TextBlock block : visionText.getTextBlocks()) {
        for (Text.Line line : block.getLines()) {
            String text = line.getText().toUpperCase().replaceAll("\\s", "");
            
            // Clean common OCR substitutions
            text = cleanMRZText(text);
            
            // More flexible length check for MRZ lines
            if (text.length() >= 36 && text.length() <= 46 && mrzPattern.matcher(text).matches()) {
                // Use Y coordinate to sort (bottom lines first for MRZ)
                float y = line.getBoundingBox() != null ? line.getBoundingBox().bottom : 0;
                linesByY.put(y, text);
            }
        }
    }
    
    // Sort by Y coordinate (descending - bottom to top)
    // Use Collections.sort instead of List.sort for API 23 compatibility
    List<Map.Entry<Float, String>> sortedEntries = new ArrayList<>(linesByY.entrySet());
    Collections.sort(sortedEntries, new Comparator<Map.Entry<Float, String>>() {
        @Override
        public int compare(Map.Entry<Float, String> a, Map.Entry<Float, String> b) {
            return Float.compare(b.getKey(), a.getKey());
        }
    });
    
    // Take up to 3 lines (for TD1 which has 3 lines)
    int count = 0;
    for (Map.Entry<Float, String> entry : sortedEntries) {
        if (count < 3) {
            mrzLines.add(entry.getValue());
            count++;
        }
    }
    
    // Reverse to get proper order (top to bottom)
    Collections.reverse(mrzLines);
    
    return mrzLines;
}

    
    private String cleanMRZText(String text) {
        StringBuilder cleaned = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (OCR_CORRECTIONS.containsKey(c)) {
                cleaned.append(OCR_CORRECTIONS.get(c));
            } else {
                cleaned.append(c);
            }
        }
        return cleaned.toString();
    }
    
    private JSObject parseMRZ(List<String> mrzLines) throws JSONException {
        JSObject data = new JSObject();
        
        if (mrzLines.size() < 2) {
            return data;
        }
        
        int line1Len = mrzLines.get(0).length();
        int line2Len = mrzLines.get(1).length();
        
        if (line1Len >= 42 && line1Len <= 46 && line2Len >= 42 && line2Len <= 46 && mrzLines.size() == 2) {
            return parseTD3(mrzLines.get(0), mrzLines.get(1));
        } else if (mrzLines.size() == 3 && line1Len >= 28 && line1Len <= 32) {
            return parseTD1(mrzLines);
        } else if (line1Len >= 34 && line1Len <= 38 && line2Len >= 34 && line2Len <= 38) {
            return parseTD2(mrzLines.get(0), mrzLines.get(1));
        }
        
        return data;
    }
    
    private JSObject parseTD3(String line1, String line2) throws JSONException {
        JSObject data = new JSObject();
        
        line1 = padOrTruncate(line1, 44);
        line2 = padOrTruncate(line2, 44);
        
        data.put("documentType", line1.substring(0, 1));
        String issuingState = line1.substring(2, 5).replace("<", "").trim();
        String names = line1.substring(5).replace("<", " ").trim();
        
        String[] nameParts = names.split("\\s{2,}");
        if (nameParts.length >= 2) {
            data.put("surname", nameParts[0].trim());
            data.put("givenNames", nameParts[1].trim());
        } else if (nameParts.length == 1) {
            data.put("surname", nameParts[0].trim());
            data.put("givenNames", "");
        }
        data.put("issuingState", issuingState);
        
        String passportNumber = line2.substring(0, 9).replace("<", "").trim();
        char passportCheck = line2.charAt(9);
        String nationality = line2.substring(10, 13).replace("<", "").trim();
        String dob = line2.substring(13, 19);
        char dobCheck = line2.charAt(19);
        String sex = line2.substring(20, 21);
        String expiry = line2.substring(21, 27);
        char expiryCheck = line2.charAt(27);
        String personalNumber = line2.substring(28, 42).replace("<", "").trim();
        char personalCheck = line2.charAt(42);
        
        boolean passportValid = validateChecksum(passportNumber, passportCheck);
        boolean dobValid = validateChecksum(dob, dobCheck);
        boolean expiryValid = validateChecksum(expiry, expiryCheck);
        boolean personalValid = validateChecksum(personalNumber, personalCheck);
        
        data.put("documentNumber", passportNumber);
        data.put("nationality", nationality);
        data.put("dateOfBirth", formatDate(dob));
        data.put("sex", sex);
        data.put("expiryDate", formatDate(expiry));
        data.put("personalNumber", personalNumber);
        
        data.put("checksumValid", passportValid && dobValid && expiryValid);
        data.put("checksumDetails", new JSObject()
            .put("passportNumber", passportValid)
            .put("dateOfBirth", dobValid)
            .put("expiryDate", expiryValid)
            .put("personalNumber", personalValid)
        );
        
        JSObject raw = new JSObject();
        raw.put("line1", line1);
        raw.put("line2", line2);
        raw.put("format", "TD3");
        data.put("raw", raw);
        
        return data;
    }
    
    private JSObject parseTD1(List<String> lines) throws JSONException {
        JSObject data = new JSObject();
        
        String line1 = padOrTruncate(lines.get(0), 30);
        String line2 = padOrTruncate(lines.get(1), 30);
        String line3 = padOrTruncate(lines.get(2), 30);
        
        data.put("documentType", line1.substring(0, 1));
        String issuingState = line1.substring(2, 5).replace("<", "").trim();
        String documentNumber = line1.substring(5, 14).replace("<", "").trim();
        char docNumCheck = line1.charAt(14);
        
        String dob = line2.substring(0, 6);
        char dobCheck = line2.charAt(6);
        String sex = line2.substring(7, 8);
        String expiry = line2.substring(8, 14);
        char expiryCheck = line2.charAt(14);
        String nationality = line2.substring(15, 18).replace("<", "").trim();
        
        String names = line3.replace("<", " ").trim();
        String[] nameParts = names.split("\\s{2,}");
        if (nameParts.length >= 2) {
            data.put("surname", nameParts[0].trim());
            data.put("givenNames", nameParts[1].trim());
        }
        
        boolean docNumValid = validateChecksum(documentNumber, docNumCheck);
        boolean dobValid = validateChecksum(dob, dobCheck);
        boolean expiryValid = validateChecksum(expiry, expiryCheck);
        
        data.put("documentNumber", documentNumber);
        data.put("nationality", nationality);
        data.put("dateOfBirth", formatDate(dob));
        data.put("sex", sex);
        data.put("expiryDate", formatDate(expiry));
        data.put("issuingState", issuingState);
        
        data.put("checksumValid", docNumValid && dobValid && expiryValid);
        data.put("raw", new JSObject()
            .put("line1", line1)
            .put("line2", line2)
            .put("line3", line3)
            .put("format", "TD1")
        );
        
        return data;
    }
    
    private JSObject parseTD2(String line1, String line2) throws JSONException {
        JSObject data = new JSObject();
        
        line1 = padOrTruncate(line1, 36);
        line2 = padOrTruncate(line2, 36);
        
        String issuingState = line1.substring(2, 5).replace("<", "").trim();
        String names = line1.substring(5).replace("<", " ").trim();
        
        String[] nameParts = names.split("\\s{2,}");
        if (nameParts.length >= 2) {
            data.put("surname", nameParts[0].trim());
            data.put("givenNames", nameParts[1].trim());
        }
        
        String documentNumber = line2.substring(0, 9).replace("<", "").trim();
        char docNumCheck = line2.charAt(9);
        String nationality = line2.substring(10, 13).replace("<", "").trim();
        String dob = line2.substring(13, 19);
        char dobCheck = line2.charAt(19);
        String sex = line2.substring(20, 21);
        String expiry = line2.substring(21, 27);
        char expiryCheck = line2.charAt(27);
        
        boolean docNumValid = validateChecksum(documentNumber, docNumCheck);
        boolean dobValid = validateChecksum(dob, dobCheck);
        boolean expiryValid = validateChecksum(expiry, expiryCheck);
        
        data.put("documentNumber", documentNumber);
        data.put("nationality", nationality);
        data.put("dateOfBirth", formatDate(dob));
        data.put("sex", sex);
        data.put("expiryDate", formatDate(expiry));
        data.put("issuingState", issuingState);
        data.put("checksumValid", docNumValid && dobValid && expiryValid);
        
        data.put("raw", new JSObject()
            .put("line1", line1)
            .put("line2", line2)
            .put("format", "TD2")
        );
        
        return data;
    }
    
    private boolean validateChecksum(String data, char checkDigit) {
        if (checkDigit == '<') {
            return true;
        }
        
        int[] weights = {7, 3, 1};
        int sum = 0;
        
        for (int i = 0; i < data.length(); i++) {
            char c = data.charAt(i);
            int value;
            
            if (c >= '0' && c <= '9') {
                value = c - '0';
            } else if (c >= 'A' && c <= 'Z') {
                value = c - 'A' + 10;
            } else if (c == '<') {
                value = 0;
            } else {
                continue;
            }
            
            sum += value * weights[i % 3];
        }
        
        int calculatedCheck = sum % 10;
        int providedCheck = checkDigit >= '0' && checkDigit <= '9' ? checkDigit - '0' : 0;
        
        return calculatedCheck == providedCheck;
    }
    
    private String padOrTruncate(String str, int length) {
        if (str.length() > length) {
            return str.substring(0, length);
        } else if (str.length() < length) {
            StringBuilder sb = new StringBuilder(str);
            for (int i = str.length(); i < length; i++) {
                sb.append("<");
            }
            return sb.toString();
        }
        return str;
    }
    
    private String formatDate(String yymmdd) {
        if (yymmdd.length() != 6) return yymmdd;
        
        try {
            String yy = yymmdd.substring(0, 2);
            String mm = yymmdd.substring(2, 4);
            String dd = yymmdd.substring(4, 6);
            
            int year = Integer.parseInt(yy);
            int fullYear = (year >= 50) ? 1900 + year : 2000 + year;
            
            return String.format("%04d-%s-%s", fullYear, mm, dd);
        } catch (Exception e) {
            return yymmdd;
        }
    }
    
    @Override
    protected void handleOnDestroy() {
        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }
        if (textRecognizer != null) {
            textRecognizer.close();
        }
    }
}
