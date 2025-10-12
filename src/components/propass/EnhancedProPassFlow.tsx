// src/components/propass/EnhancedProPassFlow.tsx
import { useState } from 'react';
import { ArrowLeft, Camera, Nfc, UserCheck, CheckCircle } from 'lucide-react';

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

// Individual step components
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

// ... Similar enhanced components for PassportStep and NFCStep
