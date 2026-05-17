import { LandingPage } from "@/components/landing/LandingPage";
import { ConsentRedirect } from "@/components/landing/ConsentRedirect";

export default function RootPage() {
  return (
    <>
      <div data-landing-content>
        <LandingPage />
      </div>
      <ConsentRedirect />
    </>
  );
}
