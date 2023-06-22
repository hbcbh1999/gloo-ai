import { SignIn } from "@clerk/nextjs";

const SignUpPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      afterSignUpUrl={"/dashboard"}
    />
  </div>
);

export default SignUpPage;
