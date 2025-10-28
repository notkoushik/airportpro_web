package com.airportpro.app;

import android.content.Intent;
import android.graphics.Rect;
import android.os.Bundle;
import android.util.Log;
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
import java.util.regex.Pattern;

public class PassportScanningActivity extends AppCompatActivity {

    private static final String TAG = "PassportScanning";
    private ListenableFuture<ProcessCameraProvider> cameraProviderFuture;
    private ExecutorService cameraExecutor;
    private PreviewView previewView;
    private TextRecognizer textRecognizer;

    // This ensures we only process one image at a time and only return one result
    private final AtomicBoolean isProcessing = new AtomicBoolean(false);
    private final AtomicBoolean isResultSent = new AtomicBoolean(false);

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
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_passport_scanning);

        previewView = findViewById(R.id.previewView);
        cameraExecutor = Executors.newSingleThreadExecutor();
        cameraProviderFuture = ProcessCameraProvider.getInstance(this);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        // Set up the camera
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                startCamera(cameraProvider);
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Error starting camera", e);
                sendErrorResult("Failed to initialize camera: " + e.getMessage());
            }
        }, ContextCompat.getMainExecutor(this));

        // Cancel button
        Button cancelButton = findViewById(R.id.cancel_button);
        cancelButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendCancelResult();
            }
        });
    }

    private void startCamera(ProcessCameraProvider cameraProvider) {
        cameraProvider.unbindAll();

        CameraSelector cameraSelector = new CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_BACK)
            .build();

        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build();

        imageAnalysis.setAnalyzer(cameraExecutor, new ImageAnalysis.Analyzer() {
            @Override
            @androidx.camera.core.ExperimentalGetImage
            public void analyze(@NonNull ImageProxy imageProxy) {
                // If we are already processing or have sent a result, skip this frame
                if (isProcessing.get() || isResultSent.get()) {
                    imageProxy.close();
                    return;
                }
                isProcessing.set(true);

                InputImage image = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());

                textRecognizer
                    .process(image)
                    .addOnSuccessListener(new OnSuccessListener<Text>() {
                        @Override
                        public void onSuccess(Text visionText) {
                            if (isResultSent.get()) {
                                return;
                            }
                            JSObject result = processMRZText(visionText);
                            if (result.getBoolean("success", false)) {
                                // Found a valid MRZ!
                                if (isResultSent.compareAndSet(false, true)) {
                                    sendSuccessResult(result);
                                }
                            }
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.e(TAG, "OCR processing failed", e);
                        }
                    })
                    .addOnCompleteListener(task -> {
                        imageProxy.close();
                        isProcessing.set(false); // Ready to process next frame
                    });
            }
        });

        try {
            Camera camera = cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis);
        } catch (Exception e) {
            Log.e(TAG, "Use case binding failed", e);
            sendErrorResult("Failed to bind camera use cases: " + e.getMessage());
        }
    }

    private void sendSuccessResult(JSObject data) {
        Intent resultIntent = new Intent();
        resultIntent.putExtra("scanResult", data.toString());
        setResult(RESULT_OK, resultIntent);
        finish();
    }

    private void sendErrorResult(String errorMessage) {
        Intent resultIntent = new Intent();
        resultIntent.putExtra("scanError", errorMessage);
        setResult(RESULT_CANCELED, resultIntent);
        finish();
    }

    private void sendCancelResult() {
        setResult(RESULT_CANCELED);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cameraExecutor.shutdown();
        if (textRecognizer != null) {
            textRecognizer.close();
        }
    }

    // ===================================================================================
    // === ALL MRZ PARSING LOGIC MOVED HERE FROM THE PLUGIN ===
    // ===================================================================================

    private JSObject processMRZText(Text visionText) {
        JSObject result = new JSObject();
        result.put("success", false); // Default to false

        try {
            List<String> mrzLines = extractMRZLines(visionText);

            if (mrzLines.size() >= 2) {
                JSObject passportData = parseMRZ(mrzLines);

                if (passportData.has("documentNumber") && !passportData.getString("documentNumber").isEmpty()) {
                    result.put("success", true);
                    result.put("data", passportData);
                    result.put("confidence", 0.95);
                    Log.d(TAG, "✓ SUCCESS: Passport parsed successfully");
                } else {
                    // Not a valid parse, keep result.success as false
                    Log.w(TAG, "Could not parse MRZ data - document number missing");
                }
            } else {
                // Not enough lines, keep result.success as false
                Log.d(TAG, "Not enough MRZ lines found: " + mrzLines.size());
            }
        } catch (Exception e) {
            Log.e(TAG, "✗ EXCEPTION: MRZ processing error", e);
        }
        return result;
    }

    private List<String> extractMRZLines(Text visionText) {
        List<String> mrzLines = new ArrayList<>();
        Pattern mrzPattern = Pattern.compile("^[A-Z0-9<]+$");
        List<MRZCandidate> candidates = new ArrayList<>();

        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String text = line.getText().toUpperCase().replaceAll("\\s", "");
                text = cleanMRZText(text);

                if (text.length() >= 36 && text.length() <= 46 && mrzPattern.matcher(text).matches()) {
                    float y = line.getBoundingBox() != null ? line.getBoundingBox().centerY() : 0;
                    candidates.add(new MRZCandidate(text, y, line.getBoundingBox()));
                }
            }
        }

        if (candidates.isEmpty()) {
            candidates = extractWithElementConcatenation(visionText, mrzPattern);
        }

        List<List<MRZCandidate>> clusters = clusterByYCoordinate(candidates, 20.0f);

        for (List<MRZCandidate> cluster : clusters) {
            if (!cluster.isEmpty()) {
                String bestLine = getMostCompleteLine(cluster);
                if (bestLine != null && !bestLine.isEmpty()) {
                    mrzLines.add(bestLine);
                }
            }
        }

        if (mrzLines.size() == 1 && mrzLines.get(0).length() >= 72) {
            return splitConcatenatedMRZ(mrzLines.get(0));
        }

        return mrzLines;
    }

    private static class MRZCandidate {
        String text;
        float yCoordinate;
        android.graphics.Rect boundingBox;
        MRZCandidate(String text, float y, android.graphics.Rect box) {
            this.text = text;
            this.yCoordinate = y;
            this.boundingBox = box;
        }
    }

    private List<List<MRZCandidate>> clusterByYCoordinate(List<MRZCandidate> candidates, float threshold) {
        if (candidates.isEmpty()) {
            return new ArrayList<>();
        }
        Collections.sort(candidates, (a, b) -> Float.compare(b.yCoordinate, a.yCoordinate));
        List<List<MRZCandidate>> clusters = new ArrayList<>();
        List<MRZCandidate> currentCluster = new ArrayList<>();
        currentCluster.add(candidates.get(0));
        for (int i = 1; i < candidates.size(); i++) {
            MRZCandidate current = candidates.get(i);
            MRZCandidate previous = candidates.get(i - 1);
            if (Math.abs(current.yCoordinate - previous.yCoordinate) <= threshold) {
                currentCluster.add(current);
            } else {
                clusters.add(new ArrayList<>(currentCluster));
                currentCluster.clear();
                currentCluster.add(current);
            }
        }
        if (!currentCluster.isEmpty()) {
            clusters.add(currentCluster);
        }
        Collections.reverse(clusters);
        return clusters;
    }

    private String getMostCompleteLine(List<MRZCandidate> cluster) {
        String longest = "";
        for (MRZCandidate candidate : cluster) {
            if (candidate.text.length() > longest.length()) {
                longest = candidate.text;
            }
        }
        return longest;
    }

    private List<MRZCandidate> extractWithElementConcatenation(Text visionText, Pattern mrzPattern) {
        List<MRZCandidate> candidates = new ArrayList<>();
        Map<Integer, StringBuilder> linesByY = new HashMap<>();
        Map<Integer, android.graphics.Rect> boundsByY = new HashMap<>();

        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                for (Text.Element element : line.getElements()) {
                    String text = element.getText().toUpperCase().replaceAll("\\s", "");
                    text = cleanMRZText(text);
                    if (element.getBoundingBox() != null) {
                        int yBucket = Math.round(element.getBoundingBox().centerY() / 10) * 10;
                        if (!linesByY.containsKey(yBucket)) {
                            linesByY.put(yBucket, new StringBuilder());
                            boundsByY.put(yBucket, element.getBoundingBox());
                        }
                        linesByY.get(yBucket).append(text);
                    }
                }
            }
        }
        for (Map.Entry<Integer, StringBuilder> entry : linesByY.entrySet()) {
            String line = entry.getValue().toString();
            if (line.length() >= 36 && line.length() <= 46 && mrzPattern.matcher(line).matches()) {
                android.graphics.Rect bounds = boundsByY.get(entry.getKey());
                candidates.add(new MRZCandidate(line, entry.getKey(), bounds));
            }
        }
        return candidates;
    }

    private List<String> splitConcatenatedMRZ(String concatenated) {
        List<String> lines = new ArrayList<>();
        if (concatenated.length() >= 88 && concatenated.length() <= 92) {
            int midPoint = concatenated.length() / 2;
            lines.add(concatenated.substring(0, midPoint));
            lines.add(concatenated.substring(midPoint));
        } else if (concatenated.length() >= 90 && concatenated.length() <= 94) {
            int lineLength = 30;
            for (int i = 0; i < 3 && (i * lineLength) < concatenated.length(); i++) {
                int start = i * lineLength;
                int end = Math.min(start + lineLength, concatenated.length());
                lines.add(concatenated.substring(start, end));
            }
        } else if (concatenated.length() >= 72 && concatenated.length() <= 76) {
            int midPoint = concatenated.length() / 2;
            lines.add(concatenated.substring(0, midPoint));
            lines.add(concatenated.substring(midPoint));
        }
        return lines;
    }

    private String cleanMRZText(String text) {
        StringBuilder cleaned = new StringBuilder();
        for (char c : text.toCharArray()) {
            cleaned.append(OCR_CORRECTIONS.getOrDefault(c, c));
        }
        return cleaned.toString();
    }

    private JSObject parseMRZ(List<String> mrzLines) throws JSONException {
        if (mrzLines.size() < 2) return new JSObject();
        int line1Len = mrzLines.get(0).length();
        int line2Len = mrzLines.get(1).length();
        if (line1Len >= 42 && line1Len <= 46 && line2Len >= 42 && line2Len <= 46 && mrzLines.size() == 2) {
            return parseTD3(mrzLines.get(0), mrzLines.get(1));
        } else if (mrzLines.size() == 3 && line1Len >= 28 && line1Len <= 32) {
            return parseTD1(mrzLines);
        } else if (line1Len >= 34 && line1Len <= 38 && line2Len >= 34 && line2Len <= 38) {
            return parseTD2(mrzLines.get(0), mrzLines.get(1));
        }
        if (mrzLines.size() == 2) {
            return parseTD3(mrzLines.get(0), mrzLines.get(1));
        }
        return new JSObject();
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
        data.put("checksumDetails", new JSObject().put("passportNumber", passportValid).put("dateOfBirth", dobValid).put("expiryDate", expiryValid).put("personalNumber", personalValid));
        data.put("raw", new JSObject().put("line1", line1).put("line2", line2).put("format", "TD3"));
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
        data.put("raw", new JSObject().put("line1", line1).put("line2", line2).put("line3", line3).put("format", "TD1"));
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
        data.put("raw", new JSObject().put("line1", line1).put("line2", line2).put("format", "TD2"));
        return data;
    }

    private boolean validateChecksum(String data, char checkDigit) {
        if (checkDigit == '<') return true;
        int[] weights = { 7, 3, 1 };
        int sum = 0;
        for (int i = 0; i < data.length(); i++) {
            char c = data.charAt(i);
            int value;
            if (c >= '0' && c <= '9') value = c - '0';
            else if (c >= 'A' && c <= 'Z') value = c - 'A' + 10;
            else if (c == '<') value = 0;
            else continue;
            sum += value * weights[i % 3];
        }
        int calculatedCheck = sum % 10;
        int providedCheck = (checkDigit >= '0' && checkDigit <= '9') ? checkDigit - '0' : 0;
        return calculatedCheck == providedCheck;
    }

    private String padOrTruncate(String str, int length) {
        if (str.length() > length) {
            return str.substring(0, length);
        } else if (str.length() < length) {
            StringBuilder sb = new StringBuilder(str);
            for (int i = str.length(); i < length; i++) sb.append("<");
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
}