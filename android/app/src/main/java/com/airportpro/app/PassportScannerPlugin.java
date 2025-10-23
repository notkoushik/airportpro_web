package com.airportpro.app;

import android.Manifest;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
import java.util.ArrayList;
import java.util.List;
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
        
        // For Phase 1, use Capacitor Camera to capture image first
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
            // Handle both file:// URIs and absolute paths
            String cleanPath = imagePath.replace("file://", "");
            File imageFile = new File(cleanPath);
            
            if (!imageFile.exists()) {
                call.reject("Image file not found at: " + cleanPath);
                return;
            }

            Bitmap bitmap = BitmapFactory.decodeFile(cleanPath);
            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }

            InputImage image = InputImage.fromBitmap(bitmap, 0);
            
            textRecognizer.process(image)
                .addOnSuccessListener(new OnSuccessListener<Text>() {
                    @Override
                    public void onSuccess(Text visionText) {
                        JSObject result = processMRZText(visionText);
                        call.resolve(result);
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        call.reject("OCR processing failed: " + e.getMessage());
                    }
                });
                
        } catch (Exception e) {
            call.reject("Error processing image: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkModelsReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", textRecognizer != null);
        call.resolve(result);
    }

    private JSObject processMRZText(Text visionText) {
        JSObject result = new JSObject();
        
        try {
            List<String> mrzLines = extractMRZLines(visionText);
            
            if (mrzLines.size() >= 2) {
                JSObject passportData = parseMRZ(mrzLines);
                
                if (passportData.has("documentNumber")) {
                    result.put("success", true);
                    result.put("data", passportData);
                    result.put("confidence", 0.95);
                } else {
                    result.put("success", false);
                    result.put("error", "Could not parse MRZ data");
                }
            } else {
                result.put("success", false);
                result.put("error", "MRZ not detected. Please ensure passport is clearly visible.");
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
        
        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String text = line.getText().toUpperCase().replaceAll("\\s", "");
                
                // TD3 (Passport): 44 characters per line
                if (text.length() >= 40 && text.length() <= 45 && mrzPattern.matcher(text).matches()) {
                    mrzLines.add(text);
                }
            }
        }
        
        return mrzLines;
    }

    private JSObject parseMRZ(List<String> mrzLines) throws JSONException {
        JSObject data = new JSObject();
        
        if (mrzLines.size() < 2) {
            return data;
        }
        
        String line1 = mrzLines.get(0);
        String line2 = mrzLines.get(1);
        
        // Line 1: Document type (1) + Issuing state (3) + Surname << Given names
        if (line1.length() >= 44) {
            String issuingState = line1.substring(2, 5).replace("<", "");
            String names = line1.substring(5).replace("<", " ").trim();
            
            String[] nameParts = names.split("  +");
            if (nameParts.length >= 2) {
                data.put("surname", nameParts[0].trim());
                data.put("givenNames", nameParts[1].trim());
            } else if (nameParts.length == 1) {
                data.put("surname", nameParts[0].trim());
                data.put("givenNames", "");
            }
            
            data.put("issuingState", issuingState);
        }
        
        // Line 2: Passport number + Nationality + DOB + Sex + Expiry + Personal number
        if (line2.length() >= 44) {
            String passportNumber = line2.substring(0, 9).replace("<", "").trim();
            String nationality = line2.substring(10, 13).replace("<", "");
            String dob = line2.substring(13, 19);
            String sex = line2.substring(20, 21);
            String expiry = line2.substring(21, 27);
            String personalNumber = line2.substring(28, 42).replace("<", "").trim();
            
            data.put("documentNumber", passportNumber);
            data.put("nationality", nationality);
            data.put("dateOfBirth", formatDate(dob));
            data.put("sex", sex);
            data.put("expiryDate", formatDate(expiry));
            data.put("personalNumber", personalNumber);
            
            // Store raw MRZ
            JSObject raw = new JSObject();
            raw.put("line1", line1);
            raw.put("line2", line2);
            data.put("raw", raw);
        }
        
        return data;
    }

    private String formatDate(String yymmdd) {
        if (yymmdd.length() != 6) return yymmdd;
        
        String yy = yymmdd.substring(0, 2);
        String mm = yymmdd.substring(2, 4);
        String dd = yymmdd.substring(4, 6);
        
        int year = Integer.parseInt(yy);
        int fullYear = (year >= 50) ? 1900 + year : 2000 + year;
        
        return String.format("%04d-%s-%s", fullYear, mm, dd);
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
