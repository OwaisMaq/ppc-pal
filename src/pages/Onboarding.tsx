import { OnboardingWizard } from "@/components/OnboardingWizard";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const navigate = useNavigate();

  return (
    <OnboardingWizard onComplete={() => navigate('/dashboard')} />
  );
};

export default Onboarding;
