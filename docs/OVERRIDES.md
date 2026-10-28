# Funkcijų perrašymų grandinės (generuojama)

Šis failas sugeneruotas `npm run check`. Nekeisk ranka.

Programėlė augo pridedant naujas versijas, kurios **perrašo** ankstesnes funkcijas tame pačiame scope.
Galioja **paskutinis** įrašas sąraše. `function` = deklaracija (keli `function X` tame pačiame scope: laimi paskutinė,
nes deklaracijos „iškeliamos“ – hoisting), `reassigned` = `X = function…` vykdymo metu (dažnai apgaubia ankstesnę versiją).

| Funkcija | Grandinė (failas:eilutė) |
|---|---|
| `daysBetweenISO` | 01-core-utils:67 (function) → 15-work-center:4 (function) |
| `compressPhoto` | 03-photo-storage:123 (function) → 52-compress-v68:70 (reassigned) |
| `openGarageLeadsPage` | 04-garage-leads:174 (function) → 44-smooth-v62:20 (reassigned) |
| `openGarageContacts` | 04-garage-leads:206 (function) → 44-smooth-v62:29 (reassigned) |
| `openGarageTasks` | 04-garage-leads:231 (function) → 44-smooth-v62:34 (reassigned) |
| `downloadAllEntityPhotos` | 05-zip-and-galleries:28 (function) → 05-zip-and-galleries:208 (function) |
| `openGarageLeadSheet` | 05-zip-and-galleries:313 (function) → 45-lead-sheet-v62:59 (reassigned) → 51-photo-fill-v67:79 (reassigned) |
| `saveState` | 06-state-and-history:119 (function) → 54-readonly-v70:21 (reassigned) |
| `openCar` | 09-cars-and-sale:148 (function) → 37-contract-v52:930 (reassigned) → 47-car-tasks-v63:99 (reassigned) → 56-v73:4 (reassigned) |
| `renderCarSheet` | 09-cars-and-sale:158 (function) → 14-vehicle-fields-documents:303 (reassigned) → 24-accounting-v3-pp-chooser:589 (reassigned) → 30-registration-review-v41:1338 (reassigned) → 31-registration-v42-v43:543 (reassigned) → 34-registration-ui:562 (reassigned) → 35-car-ui-v51:377 (reassigned) → 38-car-card-v55:6 (reassigned) → 42-car-sheet-v61:121 (reassigned) → 47-car-tasks-v63:90 (reassigned) → 50-car-manager-v66:4 (reassigned) → 51-photo-fill-v67:74 (reassigned) → 53-v69:32 (reassigned) |
| `openCarEditSheet` | 09-cars-and-sale:247 (function) → 14-vehicle-fields-documents:355 (reassigned) → 30-registration-review-v41:866 (reassigned) → 31-registration-v42-v43:494 (reassigned) → 34-registration-ui:526 (reassigned) → 35-car-ui-v51:278 (reassigned) |
| `openSheet` | 09-cars-and-sale:428 (function) → 47-car-tasks-v63:84 (reassigned) |
| `closeSheet` | 09-cars-and-sale:432 (function) → 39-profile-onboarding-v57:179 (reassigned) |
| `renderGarageStatsPage` | 10-render:4 (function) → 17-stats-period-boot:59 (reassigned) |
| `renderFinancePage` | 10-render:138 (function) → 25-accounting-v8-transactions-reports:517 (reassigned) |
| `render` | 10-render:185 (function) → 18-pp-contract-generator:469 (reassigned) → 24-accounting-v3-pp-chooser:551 (reassigned) → 27-home-reference-v12-v19:92 (reassigned) → 32-unified-garage-tasks-and-boot:135 (reassigned) → 39-profile-onboarding-v57:299 (reassigned) → 43-tasks-hub-v62:316 (reassigned) → 46-nav-v63:48 (reassigned) → 51-photo-fill-v67:87 (reassigned) → 56-v73:33 (reassigned) |
| `renderCustomers` | 13-customers-and-backup:21 (function) → 21-contacts:113 (reassigned) |
| `vehicleFields` | 14-vehicle-fields-documents:67 (function) → 24-accounting-v3-pp-chooser:219 (reassigned) → 24-accounting-v3-pp-chooser:558 (reassigned) → 30-registration-review-v41:736 (reassigned) → 31-registration-v42-v43:453 (reassigned) → 34-registration-ui:164 (reassigned) |
| `readVehicleFields` | 14-vehicle-fields-documents:84 (function) → 24-accounting-v3-pp-chooser:207 (reassigned) → 24-accounting-v3-pp-chooser:567 (reassigned) → 30-registration-review-v41:746 (reassigned) → 31-registration-v42-v43:462 (reassigned) → 34-registration-ui:173 (reassigned) |
| `readDocumentFile` | 14-vehicle-fields-documents:166 (function) → 52-compress-v68:78 (reassigned) |
| `carRecommendation` | 15-work-center:20 (function) → 35-car-ui-v51:417 (reassigned) |
| `workCenterMissingFieldsV30` | 15-work-center:118 (function) → 30-registration-review-v41:953 (reassigned) |
| `workCenterItems` | 15-work-center:153 (function) → 35-car-ui-v51:412 (reassigned) |
| `shareAccountingCars` | 16-accounting-package:158 (function) → 20-accounting-share:91 (reassigned) → 20-accounting-share:234 (reassigned) → 24-accounting-v3-pp-chooser:55 (reassigned) |
| `renderAccountingCenter` | 16-accounting-package:229 (function) → 18-pp-contract-generator:459 (reassigned) → 20-accounting-share:151 (reassigned) → 20-accounting-share:320 (reassigned) → 24-accounting-v3-pp-chooser:119 (reassigned) → 24-accounting-v3-pp-chooser:134 (reassigned) → 24-accounting-v3-pp-chooser:296 (reassigned) → 24-accounting-v3-pp-chooser:461 (reassigned) → 25-accounting-v8-transactions-reports:533 (reassigned) → 53-v69:130 (reassigned) |
| `ppLoadOcr` | 18-pp-contract-generator:91 (function) → 19-pp-pdf-offline-and-ocr:562 (reassigned) |
| `ppParseRegistrationText` | 18-pp-contract-generator:112 (function) → 19-pp-pdf-offline-and-ocr:360 (reassigned) → 24-accounting-v3-pp-chooser:224 (reassigned) → 29-registration-parse-v35-v36:310 (reassigned) |
| `ppScanRegistration` | 18-pp-contract-generator:189 (function) → 19-pp-pdf-offline-and-ocr:619 (reassigned) → 29-registration-parse-v35-v36:521 (reassigned) → 34-registration-ui:688 (reassigned) |
| `ppGenerate` | 18-pp-contract-generator:260 (function) → 19-pp-pdf-offline-and-ocr:304 (reassigned) |
| `ppPrefillFromCar` | 18-pp-contract-generator:365 (function) → 24-accounting-v3-pp-chooser:254 (reassigned) |
| `ppGeneratorHtml` | 18-pp-contract-generator:398 (function) → 19-pp-pdf-offline-and-ocr:680 (reassigned) → 20-accounting-share:297 (reassigned) |
| `bindPpGenerator` | 18-pp-contract-generator:402 (function) → 20-accounting-share:306 (reassigned) |
| `openPpGeneratorForCar` | 18-pp-contract-generator:439 (function) → 24-accounting-v3-pp-chooser:386 (reassigned) → 37-contract-v52:910 (reassigned) |
| `ppDetectDocumentBounds` | 19-pp-pdf-offline-and-ocr:481 (function) → 29-registration-parse-v35-v36:322 (reassigned) |
| `ppOcrWorker` | 19-pp-pdf-offline-and-ocr:589 (function) → 30-registration-review-v41:434 (reassigned) |
| `accountingDirectEntries` | 20-accounting-share:4 (function) → 20-accounting-share:206 (reassigned) → 24-accounting-v3-pp-chooser:17 (reassigned) |
| `renderCompanyHome` | 22-other-tasks-and-home:237 (function) → 24-accounting-v3-pp-chooser:399 (reassigned) → 27-home-reference-v12-v19:32 (reassigned) → 27-home-reference-v12-v19:158 (reassigned) |
| `openWhatMissingDataV30` | 23-garage-what-manager:56 (function) → 30-registration-review-v41:961 (reassigned) → 34-registration-ui:595 (reassigned) |
| `accountingPpChooserV3` | 24-accounting-v3-pp-chooser:281 (function) → 24-accounting-v3-pp-chooser:448 (reassigned) |
| `newCarExtractYearV29` | 28-new-car-smart-add-v29:13 (function) → 29-registration-parse-v35-v36:317 (reassigned) |
| `newCarApplyRegistrationV29` | 28-new-car-smart-add-v29:57 (function) → 30-registration-review-v41:765 (reassigned) → 31-registration-v42-v43:438 (reassigned) |
| `newCarScanRegistrationV29` | 28-new-car-smart-add-v29:84 (function) → 29-registration-parse-v35-v36:558 (reassigned) → 30-registration-review-v41:806 (reassigned) → 31-registration-v42-v43:467 (reassigned) |
| `newCarReadScanFieldsV29` | 28-new-car-smart-add-v29:186 (function) → 30-registration-review-v41:785 (reassigned) |
| `regModelV35` | 29-registration-parse-v35-v36:157 (function) → 29-registration-parse-v35-v36:333 (reassigned) |
| `registrationCertificateScanV31` | 29-registration-parse-v35-v36:519 (reassigned) → 30-registration-review-v41:426 (reassigned) → 31-registration-v42-v43:402 (reassigned) → 34-registration-ui:744 (reassigned) |
| `registrationParseDocumentV41` | 30-registration-review-v41:113 (function) → 31-registration-v42-v43:399 (reassigned) |
| `registrationMergeFieldsV41` | 30-registration-review-v41:243 (function) → 31-registration-v42-v43:400 (reassigned) |
| `registrationScanUnifiedV41` | 30-registration-review-v41:349 (function) → 31-registration-v42-v43:401 (reassigned) → 34-registration-ui:742 (reassigned) |
| `registrationReviewV41` | 30-registration-review-v41:527 (function) → 31-registration-v42-v43:410 (reassigned) |
| `registrationFormResultV41` | 30-registration-review-v41:669 (function) → 31-registration-v42-v43:425 (reassigned) |
| `registrationScanUnifiedV42` | 31-registration-v42-v43:275 (function) → 34-registration-ui:743 (reassigned) |
| `cdInfoHTMLV51` | 35-car-ui-v51:343 (function) → 41-car-detail-v60:17 (reassigned) |
