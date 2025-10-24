// src/components/propass/EnhancedProPassFlow.tsx
import { useState } from 'react';
import { ArrowLeft, Camera, Nfc, UserCheck, CheckCircle } from 'lucide-react';

// Individual step components (moved to top for proper declaration order)
const StartStep = ({ onNext }: { onNext: () => void }) => (
  <div className="step-start">
    <div className="welcome-content">
      <h2>ML Kit Powered Identity Verification</h2>
      <p>Complete your ProPass enrollment in 4 simple steps:</p>
      
      <div className="step-preview">
        <div className="preview-item">
          <UserCheck className="preview-icon" />
          <div>
            <h4>Liveness Check</h4>
            <p>Verify you're a real person</p>
          </div>
        </div>
        
        <div className="preview-item">
          <Camera className="preview-icon" />
          <div>
            <h4>Scan Passport</h4>
            <p>Read your travel document</p>
          </div>
        </div>
        
        <div className="preview-item">
          <Nfc className="preview-icon" />
          <div>
            <h4>NFC Verification</h4>
            <p>Authenticate passport chip</p>
          </div>
        </div>
      </div>
    </div>
    
    <button onClick={onNext} className="btn-primary">
      Start Enrollment
    </button>
  </div>
);

const LivenessStep = ({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<'passed' | 'failed' | null>(null);

  const startLivenessCheck = async () => {
    setIsChecking(true);
    try {
      // Access camera and run liveness detection
      const image = await (window as any).Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'DataUrl'
      });

      const livenessResult = await (window as any).LivenessPlugin?.checkLiveness({
        imageData: image.dataUrl
      });

      const passed = livenessResult?.isLive || false;
      setResult(passed ? 'passed' : 'failed');
      
      if (passed) {
        setTimeout(() => onNext(livenessResult), 1500);
      }
    } catch (error) {
      console.error('Liveness check failed:', error);
      setResult('failed');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="step-liveness">
      <h2>Liveness Verification</h2>
      <p>Look directly at the camera and blink naturally</p>

      {!isChecking && !result && (
        <button onClick={startLivenessCheck} className="btn-primary">
          Start Liveness Check
        </button>
      )}

      {isChecking && (
        <div className="checking-indicator">
          <div className="spinner" />
          <p>Analyzing...</p>
        </div>
      )}

      {result && (
        <div className={`result ${result}`}>
          <p>Liveness Check: {result === 'passed' ? 'PASSED ✓' : 'FAILED ✗'}</p>
          {result === 'failed' && (
            <button onClick={() => setResult(null)} className="btn-retry">
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

type EnrollmentStep = 'start' | 'liveness' | 'passport' | 'nfc' | 'complete';

interface StepData {
  liveness?: any;
  passport?: any;
  nfc?: any;
}

export const EnhancedProPassFlow = () => {
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>('start');
  const [stepData, setStepData] = useState<StepData>({});
  const [progress, setProgress] = useState(0);

  const steps = [
    { id: 'start', title: 'Welcome', progress: 0 },
    { id: 'liveness', title: 'Liveness Check', progress: 25 },
    { id: 'passport', title: 'Scan Passport', progress: 50 },
    { id: 'nfc', title: 'Read NFC Chip', progress: 75 },
    { id: 'complete', title: 'Complete', progress: 100 }
  ];

  const goBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      const prevStep = steps[stepIndex - 1];
      setCurrentStep(prevStep.id as EnrollmentStep);
      setProgress(prevStep.progress);
    }
  };

  const goNext = (data?: any) => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (data) {
      setStepData(prev => ({ ...prev, [currentStep]: data }));
    }
    
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1];
      setCurrentStep(nextStep.id as EnrollmentStep);
      setProgress(nextStep.progress);
    }
  };

  return (
    <div className="enhanced-propass-flow">
      {/* Header with Back Button */}
      <div className="flow-header">
        {currentStep !== 'start' && (
          <button onClick={goBack} className="back-button">
            <ArrowLeft size={20} />
            Back
          </button>
        )}
        <h1>AirportPro ProPass</h1>
        <div className="progress-indicator">
          Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="step-content">
        {currentStep === 'start' && (
          <StartStep onNext={goNext} />
        )}
        
        {currentStep === 'liveness' && (
          <LivenessStep onNext={goNext} onBack={goBack} />
        )}
        
        {currentStep === 'passport' && (
          <PassportStep onNext={goNext} onBack={goBack} />
        )}
        
        {currentStep === 'nfc' && (
          <NFCStep 
            passportData={stepData.passport}
            onNext={goNext} 
            onBack={goBack} 
          />
        )}
        
        {currentStep === 'complete' && (
          <CompleteStep stepData={stepData} />
        )}
      </div>

      {/* Step Navigation Footer */}
      <div className="flow-footer">
        <div className="step-indicators">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`step-indicator ${
                index <= steps.findIndex(s => s.id === currentStep) 
                  ? 'completed' 
                  : 'pending'
              }`}
            >
              {step.id === 'liveness' && <UserCheck size={16} />}
              {step.id === 'passport' && <Camera size={16} />}
              {step.id === 'nfc' && <Nfc size={16} />}
              {step.id === 'complete' && <CheckCircle size={16} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PassportStep = ({ onNext, onBack }: { onNext: (data: any) => void; onBack: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);

  const startPassportScan = async () => {
    setIsScanning(true);
    try {
      const image = await (window as any).Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'DataUrl'
      });

      const scanResult = await (window as any).PassportScannerPlugin?.scanPassportMRZ({
        imageData: image.dataUrl
      });

      const success = scanResult?.success || false;
      setResult(success ? 'success' : 'failed');

      if (success) {
        // Pass up scanResult.data, which might be scanResult.mrzResult
        // Assuming scanResult.data is what you need
        setTimeout(() => onNext(scanResult.data || scanResult.mrzResult), 1500);
      }
    } catch (error) {
      console.error('Passport scan failed:', error);
      setResult('failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="step-container">
      <h2>Scan Your Passport</h2>
      <p>Position the data page of your passport in the camera view</p>
      {!isScanning && !result && (
        <button onClick={startPassportScan} className="primary-button">
          <Camera /> Start Passport Scan
        </button>
      )}
      {isScanning && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Scanning passport...</p>
        </div>
      )}
      {result && (
        <div className={`result ${result}`}>
          <p>Passport Scan: {result === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}</p>
          {result === 'failed' && (
            <button onClick={startPassportScan}>Retry</button>
          )}
        </div>
      )}
      <button onClick={onBack} className="secondary-button">
        <ArrowLeft /> Back
      </button>
    </div>
  );
};

const NFCStep = ({
  passportData,
  onNext,
  onBack
}: {
  passportData: any;
  onNext: (data: any) => void;
  onBack: () => void
}) => {
  const [isReading, setIsReading] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);

  const startNFCRead = async () => {
    setIsReading(true);
    try {
      // Ensure passportData exists and has the required fields
      if (!passportData || !passportData.documentNumber || !passportData.dateOfBirth || !passportData.expiryDate) {
         console.error('NFC read failed: Missing passport data', passportData);
         setResult('failed');
         setIsReading(false);
         return;
      }

      const nfcResult = await (window as any).NFCPassportReaderPlugin?.readNFCPassport({
        documentNumber: passportData?.documentNumber,
        dateOfBirth: passportData?.dateOfBirth, // Make sure this is "YYMMDD"
        dateOfExpiry: passportData?.expiryDate   // Make sure this is "YYMMDD"
      });

      const success = nfcResult?.success || false;
      setResult(success ? 'success' : 'failed');

      if (success) {
        setTimeout(() => onNext(nfcResult.data), 1500);
      }
    } catch (error) {
      console.error('NFC read failed:', error);
      setResult('failed');
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="step-container">
      <h2>NFC Chip Verification</h2>
      <p>Hold your passport against the back of your device</p>
      {!isReading && !result && (
        <div>
          <button onClick={startNFCRead} className="primary-button">
            <Nfc /> Start NFC Read
          </button>
          <button onClick={() => onNext(null)} className="secondary-button">
            Skip NFC (Optional)
          </button>
        </div>
      )}
      {isReading && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Reading NFC chip...</p>
        </div>
      )}
      {result && (
        <div className={`result ${result}`}>
          <p>NFC Read: {result === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}</p>
          {result === 'failed' && (
            <button onClick={startNFCRead}>Retry</button>
          )}
        </div>
      )}
      <button onClick={onBack} className="secondary-button">
        <ArrowLeft /> Back
      </button>
    </div>
  );
};

const CompleteStep = ({ stepData }: { stepData: StepData }) => {
  return (
    <div className="step-container complete">
      <div className="success-icon">
        <CheckCircle size={64} />
      </div>
      <h2>Enrollment Complete!</h2>
      <p>Your ProPass has been successfully created</p>
      <div className="summary">
        <h3>Verification Summary:</h3>
        <div className="summary-item">
          <UserCheck /> Liveness: {stepData.liveness ? '✓ Verified' : '✗ Failed'}
        </div>
        <div className="summary-item">
          <Camera /> Passport: {stepData.passport ? '✓ Scanned' : '✗ Failed'}
        </div>
        <div className="summary-item">
          <Nfc /> NFC: {stepData.nfc ? '✓ Read' : '⊘ Skipped'}
        </div>
      </div>
      <button onClick={() => window.location.href = '/'} className="primary-button">
        Return to Home
      </button>
    </div>
  );
};