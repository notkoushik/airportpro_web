package com.airportpro.app;

import android.content.Intent;
import android.content.pm.PackageManager;
// Removed unused Rect import
import android.os.Bundle;
import android.util.Log;
import android.util.Size; // Import Size
import android.view.View;
import android.widget.Button;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

// Imports from Tananaev's library
import com.github.tananaev.passportreader.MRZ;

import com.getcapacitor.JSObject;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher; // Import Matcher
import java.util.regex.Pattern;

public class PassportScanningActivity extends AppCompatActivity {

    private static final String TAG = "PassportScanning";
    private ListenableFuture<ProcessCameraProvider> cameraProviderFuture;
    private ExecutorService cameraExecutor;
    private PreviewView previewView;
    private TextRecognizer textRecognizer;

    private final AtomicBoolean isResultSent = new AtomicBoolean(false);

    // --- OPTIMIZATION: Stricter Regex based on Kotlin reference ---
    private static final Pattern MRZ_REGEX_TD3 = Pattern.compile("^[A-Z0-9<]{44}$");
    // You might add patterns for TD1 (3 lines x 30 chars) or TD2 (2 lines x 36 chars) if needed
    // private static final Pattern MRZ_REGEX_TD1_L1 = Pattern.compile("^[A-Z0-9<]{30}$");
    // private static final Pattern MRZ_REGEX_TD2 = Pattern.compile("^[A-Z0-9<]{36}$");

    private static final Map<Character, Character> OCR_CORRECTIONS = new HashMap<>();
    static {
        OCR_CORRECTIONS.put('O', '0'); OCR_CORRECTIONS.put('Q', '0');
        OCR_CORRECTIONS.put('I', '1'); OCR_CORRECTIONS.put('l', '1');
        OCR_CORRECTIONS.put('Z', '2');
        OCR_CORRECTIONS.put('S', '5');
        OCR_CORRECTIONS.put('B', '8');
        OCR_CORRECTIONS.put('G', '6'); // Added potential correction
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_passport_scanning);

        previewView = findViewById(R.id.previewView);
        cameraExecutor = Executors.newSingleThreadExecutor();
        cameraProviderFuture = ProcessCameraProvider.getInstance(this);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                bindCameraUseCases(cameraProvider); // Renamed for clarity
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Error starting camera provider", e);
                sendErrorResult("Failed to initialize camera provider: " + e.getMessage());
            }
        }, ContextCompat.getMainExecutor(this));

        Button cancelButton = findViewById(R.id.cancel_button);
        cancelButton.setOnClickListener(v -> sendCancelResult());
    }

    private void bindCameraUseCases(@NonNull ProcessCameraProvider cameraProvider) {
        // --- OPTIMIZATION: Set target resolution ---
        // Try a common resolution; adjust if needed based on device tests
        Size targetResolution = new Size(1280, 720);

        Preview preview = new Preview.Builder()
                // .setTargetResolution(targetResolution) // Optional: can set on preview too
                .build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        CameraSelector cameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .build();

        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                .setTargetResolution(targetResolution) // Apply target resolution
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();

        imageAnalysis.setAnalyzer(cameraExecutor, imageProxy -> {
            // If result already sent, close immediately
            if (isResultSent.get()) {
                imageProxy.close();
                return;
            }
            processImageProxy(imageProxy); // Pass to separate method
        });

        try {
            cameraProvider.unbindAll(); // Unbind use cases before rebinding
            Camera camera = cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis);
            // You could potentially enable torch here if needed: camera.getCameraControl().enableTorch(true);
        } catch (Exception e) {
            Log.e(TAG, "Use case binding failed", e);
            sendErrorResult("Failed to bind camera use cases: " + e.getMessage());
        }
    }


    @androidx.camera.core.ExperimentalGetImage
    private void processImageProxy(ImageProxy imageProxy) {
        InputImage image = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());

        textRecognizer.process(image)
            .addOnSuccessListener(visionText -> {
                if (isResultSent.get()) return; // Double check

                // --- OPTIMIZATION: Use simplified MRZ extraction & parsing library ---
                List<String> potentialMrzLines = extractPotentialMrzLines(visionText);

                if (potentialMrzLines.size() >= 2) {
                    // Assume TD3 format (2 lines of 44 chars) for passports primarily
                    String line1 = potentialMrzLines.get(0);
                    String line2 = potentialMrzLines.get(1);

                    try {
                        MRZ mrz = new MRZ(line1, line2); // Use the library's parser
                        if (mrz.isValid()) { // Use the library's validation
                             if (isResultSent.compareAndSet(false, true)) {
                                JSObject passportData = formatMrzResult(mrz, line1, line2);
                                sendSuccessResult(passportData);
                            }
                        } else {
                            Log.d(TAG, "MRZ library validation failed for lines.");
                        }
                    } catch (Exception e) { // Catch potential errors from MRZ library
                        Log.e(TAG, "Error parsing MRZ with library", e);
                    }
                }
                // --- END OPTIMIZATION ---
            })
            .addOnFailureListener(e -> Log.e(TAG, "Text recognition failed", e))
            .addOnCompleteListener(task -> imageProxy.close()); // Ensure image proxy is closed
    }


    /**
     * Extracts potential MRZ lines based on format (length 44, regex) and sorts them.
     */
    private List<String> extractPotentialMrzLines(Text visionText) {
        List<MRZCandidate> candidates = new ArrayList<>();

        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String originalText = line.getText();
                String cleanedText = cleanMRZText(originalText.toUpperCase().replaceAll("\\s+", "")); // Clean *before* regex

                Matcher matcher = MRZ_REGEX_TD3.matcher(cleanedText);
                if (matcher.matches()) {
                    // Use center Y coordinate for sorting
                    float y = (line.getBoundingBox() != null) ? line.getBoundingBox().exactCenterY() : 0;
                    candidates.add(new MRZCandidate(cleanedText, y));
                     Log.d(TAG, "Potential MRZ Line Found: " + cleanedText + " at Y: " + y);
                }
            }
        }

        // Sort candidates by their vertical position (top to bottom)
        Collections.sort(candidates, Comparator.comparingDouble(c -> c.yCoordinate));

        // Return only the text strings
        List<String> sortedLines = new ArrayList<>();
        for (MRZCandidate candidate : candidates) {
            sortedLines.add(candidate.text);
        }

        // If we have more than 2 candidates, maybe take the bottom-most 2?
        if (sortedLines.size() > 2) {
             Log.w(TAG, "Found more than 2 potential MRZ lines (" + sortedLines.size() + "), taking bottom two.");
            return sortedLines.subList(sortedLines.size() - 2, sortedLines.size());
        }

        return sortedLines;
    }

    // Helper class for sorting lines
    private static class MRZCandidate {
        String text;
        float yCoordinate;
        MRZCandidate(String text, float y) {
            this.text = text;
            this.yCoordinate = y;
        }
    }

    /**
     * Applies OCR character corrections.
     */
    private String cleanMRZText(String text) {
        StringBuilder cleaned = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            cleaned.append(OCR_CORRECTIONS.getOrDefault(c, c));
        }
        return cleaned.toString();
    }

    /**
    * Formats the result from the MRZ library into the JSObject expected by the plugin.
    */
    private JSObject formatMrzResult(MRZ mrz, String rawLine1, String rawLine2) {
        JSObject data = new JSObject();
        JSObject raw = new JSObject();
        JSObject checksums = new JSObject();

        try {
            data.put("documentType", String.valueOf(mrz.getDocumentType())); // Usually 'P' for passport
            data.put("issuingState", mrz.getIssuingCountry()); // Or getIssuingState() ? Check library docs/source if needed
            data.put("surname", mrz.getSurname());
            data.put("givenNames", mrz.getGivenNames());
            data.put("documentNumber", mrz.getDocumentNumber());
            data.put("nationality", mrz.getNationality());
            data.put("dateOfBirth", formatDateForJS(mrz.getDateOfBirth())); // Format YYYY-MM-DD
            data.put("sex", String.valueOf(mrz.getGender())); // 'M', 'F', or 'X'/<
            data.put("expiryDate", formatDateForJS(mrz.getDateOfExpiry())); // Format YYYY-MM-DD
            data.put("personalNumber", mrz.getOptionalData()); // Or getOptionalData2 depending on format

            // Checksum info from the library
            checksums.put("passportNumber", mrz.isDocumentNumberValid());
            checksums.put("dateOfBirth", mrz.isDateOfBirthValid());
            checksums.put("expiryDate", mrz.isDateOfExpiryValid());
            checksums.put("personalNumber", mrz.isOptionalDataValid()); // Check if this corresponds

            data.put("checksumValid", mrz.isDocumentNumberValid() && mrz.isDateOfBirthValid() && mrz.isDateOfExpiryValid());
            data.put("checksumDetails", checksums);

            // Raw data
            raw.put("line1", rawLine1);
            raw.put("line2", rawLine2);
            raw.put("format", "TD3"); // Assuming TD3 based on line length
            data.put("raw", raw);

            data.put("success", true); // Add success flag within the data object if needed by JS
            Log.d(TAG, "✓ SUCCESS: Passport parsed successfully by library");

        } catch (Exception e) {
             Log.e(TAG, "Error formatting MRZ result", e);
             // Return a failure object?
             data.put("success", false);
             data.put("error", "Error formatting MRZ data: " + e.getMessage());
        }

        // Create the final object structure expected by the plugin's resolve
        JSObject finalResult = new JSObject();
        finalResult.put("success", data.getBoolean("success", false));
        if (finalResult.getBoolean("success")) {
            finalResult.put("data", data);
            finalResult.put("confidence", 0.95); // Example confidence
        } else {
             finalResult.put("error", data.getString("error", "Unknown formatting error"));
        }

        return finalResult; // This object will be passed back
    }

    // Helper to format date string YYYY-MM-DD
    private String formatDateForJS(String yyMMdd) {
        if (yyMMdd == null || yyMMdd.length() != 6) return yyMMdd; // Return original if invalid
        try {
            String yy = yyMMdd.substring(0, 2);
            String mm = yyMMdd.substring(2, 4);
            String dd = yyMMdd.substring(4, 6);
            int year = Integer.parseInt(yy);
            // Adjust century based on YY (common MRZ practice)
            int fullYear = (year >= 0 && year <= (java.time.LocalDate.now().getYear() % 100 + 10)) ? 2000 + year : 1900 + year; // Heuristic
            return String.format("%04d-%s-%s", fullYear, mm, dd);
        } catch (NumberFormatException e) {
            return yyMMdd; // Return original on parsing error
        }
    }


    // --- Methods for sending results back to the plugin ---
    private void sendSuccessResult(JSObject data) {
        Intent resultIntent = new Intent();
        resultIntent.putExtra("scanResult", data.toString()); // Pass the formatted JSObject
        setResult(RESULT_OK, resultIntent);
        finish();
    }

    private void sendErrorResult(String errorMessage) {
        if (!isResultSent.getAndSet(true)) { // Prevent sending multiple errors
            Intent resultIntent = new Intent();
            resultIntent.putExtra("scanError", errorMessage);
            setResult(RESULT_CANCELED, resultIntent);
            finish();
        }
    }

    private void sendCancelResult() {
         if (!isResultSent.getAndSet(true)) { // Prevent sending cancel after error/success
            setResult(RESULT_CANCELED);
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cameraExecutor.shutdown();
        if (textRecognizer != null) {
            textRecognizer.close();
        }
    }

    // --- REMOVED MANUAL PARSING METHODS ---
    // private JSObject processMRZText(...) // Removed, replaced by library call in processImageProxy
    // private List<String> extractMRZLines(...) // Removed, replaced by extractPotentialMrzLines
    // private JSObject parseMRZ(...) // Removed
    // private JSObject parseTD3(...) // Removed
    // private JSObject parseTD1(...) // Removed
    // private JSObject parseTD2(...) // Removed
    // private boolean validateChecksum(...) // Removed
    // private String padOrTruncate(...) // Removed
    // private String formatDate(...) // Removed (replaced with formatDateForJS)
}