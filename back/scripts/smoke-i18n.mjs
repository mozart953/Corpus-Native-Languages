import "dotenv/config";
import { prisma } from "../src/config/database.js";
import { pageContentService } from "../src/services/page-content.service.js";
import { wordService } from "../src/services/word.service.js";

const adminRow = await prisma.user.findUnique({ where: { email: "admin@corpus.local" }, include: { role: true } });
const reviewerRow = await prisma.user.findUnique({ where: { email: "reviewer@corpus.local" }, include: { role: true } });
const admin = { id: adminRow.id, email: adminRow.email, role: adminRow.role.code };
const reviewer = { id: reviewerRow.id, email: reviewerRow.email, role: reviewerRow.role.code };

const before = await pageContentService.getPublic("en");
console.log("public en keys:", Object.keys(before.messages).length, "| locales:", before.locales.map((l) => l.code).join(","));

const adminView = await pageContentService.getAdmin("en");
console.log("admin defaults:", Object.keys(adminView.defaults).length, "| overrides:", Object.keys(adminView.overrides).length);

const saved = await pageContentService.save("en", { "home.hero.titleLine1": "Smoke test headline" }, admin);
console.log("saved override:", saved.overrides["home.hero.titleLine1"]);

const merged = await pageContentService.getPublic("en");
console.log("merged headline:", merged.messages["home.hero.titleLine1"]);

const reset = await pageContentService.resetKey("en", "home.hero.titleLine1", admin);
console.log("after reset overrides:", Object.keys(reset.overrides).length);

const esPublic = await pageContentService.getPublic("es");
console.log("es headline:", esPublic.messages["home.hero.titleLine1"]);

const word = await prisma.word.findFirst({ where: { word: "jun" } });
const withEs = await wordService.saveTranslation(word.id, "es", { gloss: "uno", usage: "Prueba" }, reviewer);
console.log("es translation:", withEs.data.translation, "| fallback:", withEs.data.translationIsFallback);

const fallbackCheck = await wordService.getPublic(word.id, { locale: "en" });
console.log("en translation still:", fallbackCheck.data.translation);

await wordService.deleteTranslation(word.id, "es", reviewer);
const afterDelete = await wordService.getPublic(word.id, { locale: "es" });
console.log("after delete es translation:", afterDelete.data.translation, "| fallback:", afterDelete.data.translationIsFallback);

await prisma.$disconnect();
