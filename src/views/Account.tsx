import { Profile } from "./account/Profile";
import { SignIn } from "./account/SignIn";
import { useSession } from "../lib/auth-client";

/**
 * The account route: the door, or what is behind it.
 *
 * Password exists for accounts created deliberately — the demo accounts a
 * tester or a judge uses. Google is how people actually sign in.
 */
export function Account({ onDone }: { onDone: () => void }) {
  const session = useSession();
  return session.data ? <Profile onDone={onDone} /> : <SignIn />;
}
