// @/app/pages/staticRoutes.ts
import { route } from "rwsdk/router";
import ChangelogPage from "./changelog/ChangelogPage";
import AboutPage from "./about/AboutPage";
import TermsPage from "./legal/TermsPage";

// ✅ Export individual routes
export const changelogRoute = route("/changelog", ChangelogPage);
export const aboutRoute = route("/about", AboutPage);
export const termsRoute = route("/terms", TermsPage);