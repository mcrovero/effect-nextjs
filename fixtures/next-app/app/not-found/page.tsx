import * as Navigation from "@mcrovero/effect-nextjs/Navigation"
import { BasePage } from "../../lib/runtime"

export const dynamic = "force-dynamic"

export default BasePage.build(() => Navigation.NotFound)
