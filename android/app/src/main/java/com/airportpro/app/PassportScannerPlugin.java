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
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import android.graphics.Rect;

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

    // --- START: NEWLY ADDED load() METHOD ---
    @Override
    public void load() {
        Log.d(TAG, "===========================================");
        Log.d(TAG, "🔥 PassportScanner Plugin load() CALLED"); // Highlighted log
        Log.d(TAG, "===========================================");

        try {
            textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            cameraExecutor = Executors.newSingleThreadExecutor();

            Log.d(TAG, "✓ ML Kit Text Recognizer initialized");
            Log.d(TAG, "✓ Camera executor created");
            Log.d(TAG, "✓✓✓ PassportScanner Plugin LOADED SUCCESSFULLY ✓✓✓"); // Success log
            Log.d(TAG, "===========================================");

        } catch (Exception e) {
            Log.e(TAG, "✗✗✗ PassportScanner Plugin FAILED TO LOAD", e); // Failure log
        }
    }
    // --- END: NEWLY ADDED load() METHOD ---

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

            textRecognizer
                .process(image)
                .addOnSuccessListener(
                    new OnSuccessListener<Text>() {
                        @Override
                        public void onSuccess(Text visionText) {
                            JSObject result = processMRZText(visionText);
                            call.resolve(result);

                            if (processedBitmap != originalBitmap) {
                                processedBitmap.recycle();
                            }
                            originalBitmap.recycle();
                        }
                    }
                )
                .addOnFailureListener(
                    new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            call.reject("OCR processing failed: " + e.getMessage());
                            if (processedBitmap != originalBitmap) {
                                processedBitmap.recycle();
                            }
                            originalBitmap.recycle();
                        }
                    }
                );
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

        ColorMatrix colorMatrix = new ColorMatrix(
            new float[] {
                1.5f, 0, 0, 0, -50,
                0, 1.5f, 0, 0, -50,
                0, 0, 1.5f, 0, -50,
                0, 0, 0, 1, 0
            }
        );

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
            // ========== ADDED: COMPREHENSIVE DEBUGGING ==========
            Log.d(TAG, "===========================================");
            Log.d(TAG, "=== ML Kit Text Detection Results ===");
            Log.d(TAG, "===========================================");
            Log.d(TAG, "Total blocks detected: " + visionText.getTextBlocks().size());
            Log.d(TAG, "Full text: " + visionText.getText());

            // Log each block and line
            int blockIndex = 0;
            for (Text.TextBlock block : visionText.getTextBlocks()) {
                Log.d(TAG, "\n--- Block " + blockIndex + " ---");
                Log.d(TAG, "Block text: " + block.getText());
                Log.d(TAG, "Lines in block: " + block.getLines().size());

                int lineIndex = 0;
                for (Text.Line line : block.getLines()) {
                    String lineText = line.getText();
                    android.graphics.Rect bounds = line.getBoundingBox();

                    Log.d(TAG, "  Line " + lineIndex + ":");
                    Log.d(TAG, "    Text: '" + lineText + "'");
                    Log.d(TAG, "    Length: " + lineText.length());
                    Log.d(TAG, "    Cleaned: '" + lineText.toUpperCase().replaceAll("\\s", "") + "'");

                    if (bounds != null) {
                        Log.d(
                            TAG,
                            "    Position: Y=" +
                            bounds.centerY() +
                            ", X=" +
                            bounds.centerX() +
                            ", Top=" +
                            bounds.top +
                            ", Bottom=" +
                            bounds.bottom
                        );
                    }

                    lineIndex++;
                }
                blockIndex++;
            }

            Log.d(TAG, "\n===========================================");
            Log.d(TAG, "=== Extracting MRZ Lines ===");
            Log.d(TAG, "===========================================");

            List<String> mrzLines = extractMRZLines(visionText);

            Log.d(TAG, "MRZ lines extracted: " + mrzLines.size());
            for (int i = 0; i < mrzLines.size(); i++) {
                Log.d(TAG, "MRZ Line " + (i + 1) + ": '" + mrzLines.get(i) + "'");
                Log.d(TAG, "  Length: " + mrzLines.get(i).length());
            }
            Log.d(TAG, "===========================================\n");
            // ========== END DEBUGGING ==========

            if (mrzLines.size() >= 2) {
                JSObject passportData = parseMRZ(mrzLines);

                if (passportData.has("documentNumber") && !passportData.getString("documentNumber").isEmpty()) {
                    result.put("success", true);
                    result.put("data", passportData);
                    result.put("confidence", 0.95);
                    Log.d(TAG, "✓ SUCCESS: Passport parsed successfully");
                } else {
                    result.put("success", false);
                    result.put("error", "Could not parse MRZ data - document number missing");
                    result.put("rawLines", new JSObject().put("lines", String.join("\n", mrzLines)));
                    Log.e(TAG, "✗ FAILED: Document number missing from parsed data");
                }
            } else {
                result.put("success", false);
                result.put("error", "Invalid MRZ format. Expected 2 or 3 lines, got " + mrzLines.size());
                result.put("suggestion", "Make sure the bottom two lines of the passport are clearly visible with good lighting.");
                Log.e(TAG, "✗ FAILED: Only " + mrzLines.size() + " MRZ lines detected");

                // Add raw text to error response for debugging
                if (mrzLines.size() > 0) {
                    result.put("rawLines", new JSObject().put("lines", String.join("\n", mrzLines)));
                }
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Processing error: " + e.getMessage());
            Log.e(TAG, "✗ EXCEPTION: MRZ processing error", e);
        }

        return result;
    }

    /**
     * Extracts potential MRZ lines from the OCR result using clustering and fallbacks.
     */
    private List<String> extractMRZLines(Text visionText) {
        List<String> mrzLines = new ArrayList<>();
        Pattern mrzPattern = Pattern.compile("^[A-Z0-9<]+$");

        // Step 1: Collect all potential MRZ text blocks with coordinates
        List<MRZCandidate> candidates = new ArrayList<>();

        Log.d(TAG, "--- Step 1: Collecting MRZ candidates ---");

        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String text = line.getText().toUpperCase().replaceAll("\\s", "");
                text = cleanMRZText(text);

                Log.d(TAG, "Checking line: '" + text + "' (length=" + text.length() + ")");

                // Check if it matches MRZ pattern and length
                if (text.length() >= 36 && text.length() <= 46 && mrzPattern.matcher(text).matches()) {
                    float y = line.getBoundingBox() != null ? line.getBoundingBox().centerY() : 0;
                    candidates.add(new MRZCandidate(text, y, line.getBoundingBox()));
                    Log.d(TAG, "  ✓ Added as MRZ candidate (Y=" + y + ")");
                } else {
                    Log.d(
                        TAG,
                        "  ✗ Rejected: length=" +
                        text.length() +
                        ", matches pattern=" +
                        mrzPattern.matcher(text).matches()
                    );
                }
            }
        }

        Log.d(TAG, "Total candidates found: " + candidates.size());

        // Step 2: If no candidates found, try more aggressive text extraction
        if (candidates.isEmpty()) {
            Log.d(TAG, "--- Step 2: Trying element concatenation ---");
            candidates = extractWithElementConcatenation(visionText, mrzPattern);
            Log.d(TAG, "Candidates after concatenation: " + candidates.size());
        }

        // Step 3: Cluster candidates by Y-coordinate
        Log.d(TAG, "--- Step 3: Clustering by Y-coordinate ---");
        List<List<MRZCandidate>> clusters = clusterByYCoordinate(candidates, 20.0f);
        Log.d(TAG, "Number of clusters: " + clusters.size());

        // Step 4: Extract one representative line from each cluster
        Log.d(TAG, "--- Step 4: Extracting lines from clusters ---");
        for (int i = 0; i < clusters.size(); i++) {
            List<MRZCandidate> cluster = clusters.get(i);
            if (!cluster.isEmpty()) {
                Collections.sort(
                    cluster,
                    new Comparator<MRZCandidate>() {
                        @Override
                        public int compare(MRZCandidate a, MRZCandidate b) {
                            float ax = a.boundingBox != null ? a.boundingBox.left : 0;
                            float bx = b.boundingBox != null ? b.boundingBox.left : 0;
                            return Float.compare(ax, bx);
                        }
                    }
                );

                String bestLine = getMostCompleteLine(cluster);
                if (bestLine != null && !bestLine.isEmpty()) {
                    mrzLines.add(bestLine);
                    Log.d(TAG, "Cluster " + i + " → Line: '" + bestLine + "'");
                }
            }
        }

        // Step 6: Fallback - try to split concatenated lines
        if (mrzLines.size() == 1 && mrzLines.get(0).length() >= 72) { // Changed from 80 to 72 to catch TD2
            Log.d(TAG, "--- Step 6: Splitting concatenated line ---");
            List<String> split = splitConcatenatedMRZ(mrzLines.get(0));
            Log.d(TAG, "Split result: " + split.size() + " lines");
            return split;
        }

        Log.d(TAG, "Final MRZ lines count: " + mrzLines.size());
        return mrzLines;
    }

    // Helper class to store MRZ candidates
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

    /**
     * Clusters MRZ candidates by Y-coordinate to group lines that are close together
     */
    private List<List<MRZCandidate>> clusterByYCoordinate(List<MRZCandidate> candidates, float threshold) {
        if (candidates.isEmpty()) {
            return new ArrayList<>();
        }

        Collections.sort(
            candidates,
            new Comparator<MRZCandidate>() {
                @Override
                public int compare(MRZCandidate a, MRZCandidate b) {
                    return Float.compare(b.yCoordinate, a.yCoordinate);
                }
            }
        );

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

        Log.d(TAG, "Attempting to split concatenated string (length=" + concatenated.length() + ")");

        if (concatenated.length() >= 88 && concatenated.length() <= 92) {
            int midPoint = concatenated.length() / 2;
            lines.add(concatenated.substring(0, midPoint));
            lines.add(concatenated.substring(midPoint));
            Log.d(TAG, "Split as TD3 format");
        } else if (concatenated.length() >= 90 && concatenated.length() <= 94) {
            int lineLength = 30;
            for (int i = 0; i < 3 && (i * lineLength) < concatenated.length(); i++) {
                int start = i * lineLength;
                int end = Math.min(start + lineLength, concatenated.length());
                lines.add(concatenated.substring(start, end));
            }
            Log.d(TAG, "Split as TD1 format");
        } else if (concatenated.length() >= 72 && concatenated.length() <= 76) {
            int midPoint = concatenated.length() / 2;
            lines.add(concatenated.substring(0, midPoint));
            lines.add(concatenated.substring(midPoint));
            Log.d(TAG, "Split as TD2 format");
        }

        return lines;
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
        } else if (mrzLines.size() == 3 && line1Len >= 28 && line1Len <= 32) { // TD1 check
            return parseTD1(mrzLines);
        } else if (line1Len >= 34 && line1Len <= 38 && line2Len >= 34 && line2Len <= 38) { // TD2 check
            return parseTD2(mrzLines.get(0), mrzLines.get(1));
        }

        // Fallback for slightly incorrect lengths
        if (mrzLines.size() == 2) {
            Log.d(TAG, "Parsing failed on length, retrying as TD3 (lengths: " + line1Len + ", " + line2Len + ")");
            return parseTD3(mrzLines.get(0), mrzLines.get(1));
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

        data.put(
            "checksumValid",
            passportValid && dobValid && expiryValid
        );
        data.put(
            "checksumDetails",
            new JSObject()
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
        data.put(
            "raw",
            new JSObject()
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

        data.put(
            "raw",
            new JSObject()
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

        int[] weights = { 7, 3, 1 };
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
        int providedCheck = (checkDigit >= '0' && checkDigit <= '9') ? checkDigit - '0' : 0;

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