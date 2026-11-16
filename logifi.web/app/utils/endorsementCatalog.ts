/**
 * AC 61-65K Appendix A sample endorsement catalog (issued 2025-11-14).
 * Catalog texts are snapshotted onto endorsement rows at create/sign time.
 * Already-signed rows keep their stored text; this file is for new issue only.
 * Bump catalogVersion when template wording changes.
 */
import {
  LEGACY_ENDORSEMENT_CATALOG,
  LEGACY_ENDORSEMENT_CODE_PREFIX,
} from './endorsementCatalogLegacy'

export const ENDORSEMENT_CATALOG_VERSION = '61-65K-2025-11-14'
export const ENDORSEMENT_CATALOG_EDITIONS = ['61-65K', '61-65H'] as const
export type EndorsementCatalogEdition = (typeof ENDORSEMENT_CATALOG_EDITIONS)[number]

export type EndorsementCategory =
  | 'Practical Test Prerequisites'
  | 'Student Solo'
  | 'Student Sport/Recreational'
  | 'Sport Pilot'
  | 'Recreational Pilot'
  | 'Private Pilot'
  | 'Commercial Pilot'
  | 'Airline Transport Pilot'
  | 'Instrument'
  | 'Flight Instructor'
  | 'Sport Pilot Instructor'
  | 'Ground Instructor'
  | 'Robinson SFAR 73'
  | 'Flight Review / IPC'
  | 'Complex / HP / Tailwheel / Solo'
  | 'Additional Ratings'
  | 'NVG'
  | 'EFVS'
  | 'Simplified Flight Controls'

export interface EndorsementTemplate {
  code: string
  title: string
  regulationRefs: string
  category: EndorsementCategory
  body: string
  placeholders: string[]
  /** When set, expires_at = signed_at/created + validityDays. */
  validityDays?: number
}

/** Issuable AC 61-65K templates (A.1–A.96). Used by new-issue pickers. */
export const ENDORSEMENT_CATALOG: EndorsementTemplate[] = [
  {
    code: "A.1",
    title: "A.1 Prerequisites for practical test",
    regulationRefs: "14 CFR § 61.39(a)(6)(i) and (ii).",
    category: "Practical Test Prerequisites",
    body: "I certify that {{student_name}} has received and logged training time within 2 calendar months preceding the month of application in preparation for the practical test and they are prepared for the required practical test for the issuance of {{certificate_or_rating}} certificate.",
    placeholders: ["student_name", "certificate_or_rating"],
  },
  {
    code: "A.2",
    title: "A.2 Review of deficiencies identified on airman knowledge test",
    regulationRefs: "14 CFR § 61.39(a)(6)(iii), as required.",
    category: "Practical Test Prerequisites",
    body: "I certify that {{student_name}} has demonstrated satisfactory knowledge of the subject areas in which they were deficient on the {{certificate_or_rating}} airman knowledge test.",
    placeholders: ["student_name", "certificate_or_rating"],
  },
  {
    code: "A.3",
    title: "A.3 Pre-solo aeronautical knowledge",
    regulationRefs: "14 CFR § 61.87(b).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has satisfactorily completed the pre-solo knowledge test of 14 CFR § 61.87(b) for the {{make_model}} aircraft.",
    placeholders: ["student_name", "make_model"],
  },
  {
    code: "A.4",
    title: "A.4 Pre-solo flight training",
    regulationRefs: "14 CFR § 61.87(c)(1) and (2).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received and logged pre-solo flight training for the maneuvers and procedures that are appropriate to the {{make_model}} aircraft. I have determined they have demonstrated satisfactory proficiency and safety on the maneuvers and procedures required by 14 CFR § 61.87 in this or similar make and model of aircraft to be flown.",
    placeholders: ["student_name", "make_model"],
  },
  {
    code: "A.5",
    title: "A.5 Pre-solo flight training at night",
    regulationRefs: "14 CFR § 61.87(o). Flight training must be received within the 90-calendar-day period preceding the date of the flight.",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received flight training at night on night flying procedures that include takeoffs, approaches, landings, and go-arounds at night at the {{airport}} airport where the solo flight will be conducted; navigation training at night in the vicinity of the {{airport}} airport where the solo flight will be conducted. This endorsement expires 90 calendar days from the date the flight training at night was received.",
    placeholders: ["student_name", "airport"],
    validityDays: 90,
  },
  {
    code: "A.6",
    title: "A.6 Solo flight (first 90-calendar-day period)",
    regulationRefs: "14 CFR § 61.87(n).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training to qualify for solo flying. I have determined they meet the applicable requirements of 14 CFR § 61.87(n) and are proficient to make solo flights in {{make_model}}.",
    placeholders: ["student_name", "make_model"],
    validityDays: 90,
  },
  {
    code: "A.7",
    title: "A.7 Solo flight (each additional 90-calendar-day period)",
    regulationRefs: "14 CFR § 61.87(p).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training to qualify for solo flying. I have determined that they meet the applicable requirements of 14 CFR § 61.87(p) and are proficient to make solo flights in {{make_model}}.",
    placeholders: ["student_name", "make_model"],
    validityDays: 90,
  },
  {
    code: "A.8",
    title: "A.8 Solo takeoffs and landings at another airport within 25 nautical miles (NM)",
    regulationRefs: "14 CFR § 61.93(b)(1).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.93(b)(1). I have determined that they are proficient to practice solo takeoffs and landings at {{airport}}. The takeoffs and landings at {{airport}} are subject to the following conditions: {{limitations}}",
    placeholders: ["student_name", "airport", "limitations"],
  },
  {
    code: "A.9",
    title: "A.9 Solo cross-country flight",
    regulationRefs: "14 CFR § 61.93(c)(1) and (2).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required solo cross-country training. I find they have met the applicable requirements of 14 CFR § 61.93 and are proficient to make solo cross-country flights in a {{make_model}} aircraft, {{aircraft_category}}.",
    placeholders: ["student_name", "make_model", "aircraft_category"],
  },
  {
    code: "A.10",
    title: "A.10 Solo cross-country flight",
    regulationRefs: "14 CFR § 61.93(c)(3).",
    category: "Student Solo",
    body: "I have reviewed the cross-country planning of {{student_name}}. I find the planning and preparation to be correct to make the solo flight from {{departure_airport}} to {{destination_airport}} via {{route}} with landings at {{landing_airports}} in a {{make_model}} aircraft on {{date}}. {{limitations}}",
    placeholders: ["student_name", "departure_airport", "destination_airport", "route", "landing_airports", "make_model", "date", "limitations"],
  },
  {
    code: "A.11",
    title: "A.11 Repeated solo cross-country flights not more than 50 NM from the point of departure",
    regulationRefs: "14 CFR § 61.93(b)(2).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training in both directions between and at both {{airport_names}}. I have determined that they are proficient of 14 CFR § 61.93(b)(2) to conduct repeated solo cross-country flights over that route, subject to the following conditions: {{limitations}}",
    placeholders: ["student_name", "airport_names", "limitations"],
  },
  {
    code: "A.12",
    title: "A.12 Solo flight in Class B airspace",
    regulationRefs: "14 CFR § 61.95(a).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.95(a). I have determined they are proficient to conduct solo flights in {{class_b_name}} airspace. {{limitations}}",
    placeholders: ["student_name", "class_b_name", "limitations"],
  },
  {
    code: "A.13",
    title: "A.13 Solo flight to, from, or at an airport located in Class B airspace",
    regulationRefs: "14 CFR §§ 61.95(b) and 91.131(b)(1).",
    category: "Student Solo",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.95(b)(1). I have determined that they are proficient to conduct solo flight operations at {{airport}}. {{limitations}}",
    placeholders: ["student_name", "airport", "limitations"],
  },
  {
    code: "A.14",
    title: "A.14 Endorsement of U.S. citizenship recommended by the Transportation Security Administration (TSA)",
    regulationRefs: "Title 49 of the Code of Federal Regulations (49 CFR) § 1552.15(c). The flight instructor must keep a copy of the documents used to provide proof of citizenship for 5 years or make the following endorsement in the student’s logbook and the instructor’s logbook or other record used to record flight student endorsements with the following:",
    category: "Student Solo",
    body: "I certify that {{student_name}} has presented me a {{citizenship_document}} establishing that they are a U.S. citizen or national in accordance with 49 CFR § 1552.7(a).",
    placeholders: ["student_name", "citizenship_document"],
  },
  {
    code: "A.15",
    title: "A.15 Solo flight in Class B, C, and D airspace",
    regulationRefs: "14 CFR § 61.94(a).",
    category: "Student Sport/Recreational",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.94(a). I have determined they are proficient to conduct solo flights in {{airspace_name}} airspace and authorized to operate to, from, through, and at {{airport}}. {{limitations}}",
    placeholders: ["student_name", "airspace_name", "airport", "limitations"],
  },
  {
    code: "A.16",
    title: "A.16 Solo flight to, from, or at an airport located in Class B, C, or D airspace or at an airport having an operational control tower",
    regulationRefs: "14 CFR §§ 61.94(a) and 91.131(b)(1).",
    category: "Student Sport/Recreational",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.94(a)(1). I have determined that they are proficient to conduct solo flight operations at {{airport}}. {{limitations}}",
    placeholders: ["student_name", "airport", "limitations"],
  },
  {
    code: "A.17",
    title: "A.17 Aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1) and 61.309.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the required aeronautical knowledge training of 14 CFR § 61.309. I have determined that they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.18",
    title: "A.18 Taking flight proficiency check for different category or class of aircraft",
    regulationRefs: "14 CFR §§ 61.309 and 61.311.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR §§ 61.309 and 61.311 and have determined that they are prepared for the {{test_name}} proficiency check.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.19",
    title: "A.19 Passing flight proficiency check for different category or class of aircraft",
    regulationRefs: "14 CFR §§ 61.309 and 61.311.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has met the requirements of 14 CFR §§ 61.309 and 61.311, and I have determined them proficient to act as pilot in command of {{category_class}} aircraft.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.20",
    title: "A.20 Taking sport pilot practical test",
    regulationRefs: "14 CFR §§ 61.309, 61.311, and 61.313.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the training required in accordance with 14 CFR §§ 61.309 and 61.311 and met the aeronautical experience requirements of 14 CFR § 61.313. I have determined that they are prepared for the {{test_type}} practical test.",
    placeholders: ["student_name", "test_type"],
  },
  {
    code: "A.21",
    title: "A.21 Passing a sport pilot practical test",
    regulationRefs: "14 CFR §§ 61.309, 61.311, and 61.313. This endorsement is required by 14 CFR § 61.317 and is issued by an examiner.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has met the requirements of 14 CFR §§ 61.309, 61.311, and 61.313, and I have determined them proficient to act as pilot in command of {{category_class}} aircraft.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.22",
    title: "A.22 Passing a sport pilot practical test with a simplified flight controls limitation",
    regulationRefs: "14 CFR § 61.45(g)(4)(ii). This endorsement is required by 14 CFR § 61.45 and is issued by an examiner.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has successfully completed the practical test in {{category_class_model}} with simplified flight controls designation and is authorized to act as pilot in command in {{aircraft_category_class}} limited to {{aircraft_model}} with simplified flight controls designation.",
    placeholders: ["student_name", "category_class_model", "aircraft_category_class", "aircraft_model"],
  },
  {
    code: "A.23",
    title: "A.23 Class B, C, or D airspace; at an airport located in Class B, C, or D airspace; or to, from, through, or at an airport having an operational control tower",
    regulationRefs: "14 CFR § 61.325.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.325. I have determined they are proficient to conduct operations in Class B, C, or D airspace; at an airport located in Class B, C, or D airspace; or to, from, through, or at an airport having an operational control tower.",
    placeholders: ["student_name"],
  },
  {
    code: "A.24",
    title: "A.24 Aircraft that has a maximum speed in level flight with maximum continuous power (VH) less than or equal to 87 Knots Calibrated Airspeed (KCAS)",
    regulationRefs: "14 CFR § 61.327.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR § 61.327(a) in a {{make_model}} aircraft. I have determined them proficient to act as pilot in command of an aircraft that has a VH less than or equal to 87 KCAS.",
    placeholders: ["student_name", "make_model"],
  },
  {
    code: "A.25",
    title: "A.25 Aircraft that has a VH greater than 87 KCAS",
    regulationRefs: "14 CFR § 61.327.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR § 61.327(b) in a {{make_model}} aircraft. I have determined them proficient to act as pilot in command of an aircraft that has a VH greater than 87 KCAS.",
    placeholders: ["student_name", "make_model"],
  },
  {
    code: "A.26",
    title: "A.26 Flight training at night",
    regulationRefs: "14 CFR § 61.329.",
    category: "Sport Pilot",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training at night in a {{category_class}} aircraft. I have determined they meet all of the requirements of 14 CFR § 61.329(a) and are proficient to operate as a sport pilot at night.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "category_class"],
  },
  {
    code: "A.27",
    title: "A.27 To act as pilot in command (PIC) in an aircraft with retractable landing gear",
    regulationRefs: "14 CFR § 61.331(a).",
    category: "Sport Pilot",
    body: "I certify that {{student_name}}, {{certificate_number}}, has received the required training of 14 CFR § 61.331(a) in an aircraft with retractable landing gear. I have determined that they are proficient in the operation of an aircraft with retractable landing gear when exercising their sport pilot privileges.",
    placeholders: ["student_name", "certificate_number"],
  },
  {
    code: "A.28",
    title: "A.28 To act as PIC in an airplane with a manual controllable pitch propeller",
    regulationRefs: "14 CFR § 61.331(b).",
    category: "Sport Pilot",
    body: "I certify that {{student_name}}, {{certificate_number}}, has received the required training of 14 CFR § 61.331(b) in an airplane with a controllable pitch propeller. I have determined that they are proficient in the operation of an airplane with a controllable pitch propeller when exercising their sport pilot privileges.",
    placeholders: ["student_name", "certificate_number"],
  },
  {
    code: "A.29",
    title: "A.29 Aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1), 61.96(b)(3), and 61.97(b).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.97(b). I have determined that they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.30",
    title: "A.30 Flight proficiency/practical test",
    regulationRefs: "14 CFR §§ 61.96(b)(5), 61.98(a) and (b), and 61.99. The endorsement for a practical test is required in addition to the 14 CFR § 61.39 endorsements provided in paragraphs A.1 and A.2.",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR §§ 61.98(b) and 61.99. I have determined that they are prepared for the {{test_name}} practical test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.31",
    title: "A.31 Recreational pilot to operate within 50 NM of the airport where training was received",
    regulationRefs: "14 CFR § 61.101(b).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.101(b). I have determined that they are competent to operate at the {{airport}}.",
    placeholders: ["student_name", "airport"],
  },
  {
    code: "A.32",
    title: "A.32 Recreational pilot to act as PIC on a flight that exceeds 50 NM of the departure airport",
    regulationRefs: "14 CFR § 61.101(c).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required cross-country training of 14 CFR § 61.101(c). I have determined that they are proficient in cross-country flying of 14 CFR part 61 subpart E.",
    placeholders: ["student_name"],
  },
  {
    code: "A.33",
    title: "A.33 Recreational pilot with less than 400 flight hours and no logged PIC time within the preceding 180 calendar days",
    regulationRefs: "14 CFR § 61.101(g).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required 180-day recurrent training of 14 CFR § 61.101(g) in a {{make_model}} aircraft. I have determined them proficient to act as pilot in command of that aircraft.",
    placeholders: ["student_name", "make_model"],
  },
  {
    code: "A.34",
    title: "A.34 Recreational pilot to conduct solo flights for the purpose of obtaining an additional certificate or rating while under the supervision of an authorized flight instructor",
    regulationRefs: "14 CFR § 61.101(j).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.87 in a {{make_model}} aircraft. I have determined they are prepared to conduct a solo flight on {{date}} under the following conditions: {{limitations}}",
    placeholders: ["student_name", "make_model", "date", "limitations"],
  },
  {
    code: "A.35",
    title: "A.35 Class B, C, or D airspace; at an airport located in Class B, C, or D airspace; or to, from, through, or at an airport having an operational control tower",
    regulationRefs: "14 CFR § 61.101(d).",
    category: "Recreational Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.101(d). I have determined they are proficient to conduct operations in Class B, C, or D airspace; at an airport located in Class B, C, or D airspace; or to, from, through, or at an airport having an operational control tower.",
    placeholders: ["student_name"],
  },
  {
    code: "A.36",
    title: "A.36 Aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1), 61.103(d), and 61.105.",
    category: "Private Pilot",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR § 61.105. I have determined they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.37",
    title: "A.37 Flight proficiency/practical test",
    regulationRefs: "14 CFR §§ 61.103(f), 61.107(b), and 61.109. The endorsement for a practical test is required in addition to the 14 CFR § 61.39 endorsements provided in paragraphs A.1 and A.2.",
    category: "Private Pilot",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR §§ 61.107 and 61.109. I have determined they are prepared for the {{test_name}} practical test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.38",
    title: "A.38 Aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1), 61.123(c), and 61.125.",
    category: "Commercial Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.125. I have determined that they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.39",
    title: "A.39 Flight proficiency/practical test",
    regulationRefs: "14 CFR §§ 61.123(e), 61.127, and 61.129. The endorsement for a practical test is required in addition to the 14 CFR § 61.39 endorsements provided in paragraphs A.1 and A.2.",
    category: "Commercial Pilot",
    body: "I certify that {{student_name}} has received the required training of 14 CFR §§ 61.127 and 61.129. I have determined that they are prepared for the {{test_name}} practical test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.40",
    title: "A.40 Restricted privileges ATP Certificate, Airplane Multiengine Land (AMEL) rating",
    regulationRefs: "14 CFR § 61.160. This certifying statement can only be provided by an authorized institution of higher education in accordance with its Letter of Authorization (LOA). Refer to AC 61-139, Institution of Higher Education’s Application for Authority to Certify its Graduates for an Airline Transport Pilot Certificate with Reduced Aeronautical Experience.",
    category: "Airline Transport Pilot",
    body: "The {{institution_name}} certifies that the recipient of this degree has successfully completed all of the aviation coursework requirements of 14 CFR § 61.160{{section_paragraph}} and therefore meets the academic eligibility requirements of 14 CFR § 61.160{{section_paragraph}}.",
    placeholders: ["institution_name", "section_paragraph"],
  },
  {
    code: "A.41",
    title: "A.41 ATP Certification Training Program (CTP)",
    regulationRefs: "14 CFR § 61.153(e). This endorsement is only provided by an approved training provider of an ATP CTP and is found on the graduation certificate a pilot receives following completion of that training in accordance with 14 CFR § 61.156. Refer to AC 61-138, Airline Transport Pilot Certification Training Program.",
    category: "Airline Transport Pilot",
    body: "The applicant named above has successfully completed the Airline Transport Pilot Certification Training Program as required by 14 CFR § 61.156, and therefore has met the prerequisite required by 14 CFR § 61.35(a)(2) for the Airline Transport Pilot Multiengine Airplane Knowledge Test.",
    placeholders: [],
  },
  {
    code: "A.42",
    title: "A.42 Aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1) and 61.65(a) and (b).",
    category: "Instrument",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.65(b). I have determined that they are prepared for the Instrument–{{instrument_category}} knowledge test.",
    placeholders: ["student_name", "instrument_category"],
  },
  {
    code: "A.43",
    title: "A.43 Flight proficiency/practical test",
    regulationRefs: "14 CFR § 61.65(a)(6).",
    category: "Instrument",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.65(c) and (d). I have determined they are prepared for the Instrument–{{instrument_category}} practical test.",
    placeholders: ["student_name", "instrument_category"],
  },
  {
    code: "A.44",
    title: "A.44 Prerequisites for instrument practical tests",
    regulationRefs: "14 CFR § 61.39(a).",
    category: "Instrument",
    body: "I certify that {{student_name}} has received and logged the required flight time/training of 14 CFR § 61.39(a) in preparation for the practical test within 2 calendar months preceding the date of the test and has satisfactory knowledge of the subject areas in which they were shown to be deficient by the FAA Airman Knowledge Test Report. I have determined they are prepared for the Instrument–{{instrument_category}} practical test.",
    placeholders: ["student_name", "instrument_category"],
  },
  {
    code: "A.45",
    title: "A.45 Fundamentals of instructing knowledge test",
    regulationRefs: "14 CFR § 61.183(d).",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received the required fundamentals of instruction training of 14 CFR § 61.185(a)(1). I have determined that they are prepared for the Fundamentals of Instructing knowledge test.",
    placeholders: ["student_name"],
  },
  {
    code: "A.46",
    title: "A.46 Flight instructor aeronautical knowledge test",
    regulationRefs: "14 CFR § 61.183(f).",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.185(a){{cfi_knowledge_paragraph}}. I have determined that they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "cfi_knowledge_paragraph", "test_name"],
  },
  {
    code: "A.47",
    title: "A.47 Flight instructor ground and flight proficiency/practical test",
    regulationRefs: "14 CFR § 61.183(g).",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.187(b). I have determined that they are prepared for the certificated flight instructor – {{category_class}} practical test.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.48",
    title: "A.48 Flight instructor certificate with instrument–(category/class) rating/practical test",
    regulationRefs: "14 CFR §§ 61.183(g) and 61.187(a) and (b)(7). The endorsement for a practical test is required in addition to the 14 CFR § 61.39 endorsements provided in endorsements 1 and 2 (see paragraphs A.1 and A.2).",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received the required certificated flight instructor - instrument training of 14 CFR § 61.187(b)(7). I have determined they are prepared for the certificated flight instructor - instrument–{{instrument_category}} practical test.",
    placeholders: ["student_name", "instrument_category"],
  },
  {
    code: "A.49",
    title: "A.49 Spin training",
    regulationRefs: "14 CFR § 61.183(i)(1). The spin training endorsement is only required of flight instructor airplane and flight instructor glider applicants.",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.183(i) in {{airplane_or_glider}}. I have determined that they are competent and possess instructional proficiency in stall awareness, spin entry, spins, and spin recovery procedures.",
    placeholders: ["student_name", "airplane_or_glider"],
  },
  {
    code: "A.50",
    title: "A.50 Helicopter Touchdown Autorotation",
    regulationRefs: "FAA-S-8081-7, Flight Instructor Practical Test Standards for Rotorcraft Category Gyroplane Rating.",
    category: "Flight Instructor",
    body: "I certify that {{student_name}} has received training in straight-in autorotations in a single engine helicopter and autorotation with turns in a single engine helicopter to include touchdown. I have determined that they are competent in instructional knowledge relating to the elements, common errors, performance, and correction of common errors related to straight-in autorotations in a single engine helicopter and autorotation with turns in a single engine helicopter.",
    placeholders: ["student_name"],
  },
  {
    code: "A.51",
    title: "A.51 Fundamentals of instructing knowledge test",
    regulationRefs: "14 CFR § 61.405(a)(1).",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR § 61.405(a)(1). I have determined that they are prepared for the Fundamentals of Instructing knowledge test.",
    placeholders: ["student_name"],
  },
  {
    code: "A.52",
    title: "A.52 Sport pilot flight instructor aeronautical knowledge test",
    regulationRefs: "14 CFR §§ 61.35(a)(1) and 61.405(a).",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.405(a)(2). I have determined that they are prepared for the {{test_name}}.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.53",
    title: "A.53 Flight instructor with a sport pilot rating flight proficiency check for additional category/class",
    regulationRefs: "14 CFR §§ 61.409 and 61.419.",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has received the required training in accordance with 14 CFR §§ 61.409 and 61.419 and have determined that they are prepared for a proficiency check for the flight instructor with a sport pilot rating in a {{category_class}}.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.54",
    title: "A.54 Flight instructor with a sport pilot rating proficiency check completion endorsement for additional category or class privilege",
    regulationRefs: "14 CFR §§ 61.409 and 61.419.",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has successfully completed a proficiency check in accordance with 14 CFR §§ 61.409 and 61.419. I have determined that they are proficient and authorized for the additional {{category_class}} flight instructor privilege.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.55",
    title: "A.55 Flight instructor with a sport pilot rating practical test endorsement",
    regulationRefs: "14 CFR §§ 61.409 and 61.411. An endorsement is required in addition to the 14 CFR § 61.39 endorsements provided in paragraphs A.1 and A.2.",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.409 and met the aeronautical experience requirements of 14 CFR § 61.411. I have determined that they are prepared for the flight instructor with a sport pilot rating practical test in a {{category_class}}.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.56",
    title: "A.56 Flight instructor with a sport pilot rating practical test completion endorsement",
    regulationRefs: "14 CFR §§ 61.409 and 61.411. This endorsement is required by 14 CFR § 61.417 and is issued by an authorized evaluator.",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has met the requirements in accordance with 14 CFR §§ 61.409 and 61.411 and successfully completed the practical test. I have determined that they are proficient and authorized for the {{category_class}} flight instructor privilege.",
    placeholders: ["student_name", "category_class"],
  },
  {
    code: "A.57",
    title: "A.57 Flight instructor with a sport pilot rating to train sport pilots on flight by reference to instruments",
    regulationRefs: "14 CFR § 61.412. This endorsement from an instructor certificated under 14 CFR part 61 subpart H to a flight instructor with a sport pilot rating (14 CFR part 61 subpart K) authorizes the 14 CFR part 61 subpart K instructor to train sport pilot candidates on control and maneuvering an airplane solely by reference to the instruments.",
    category: "Sport Pilot Instructor",
    body: "I certify that I have given {{student_name}} 3 hours of flight training and 1 hour of ground instruction specific to providing flight training on control and maneuvering an airplane solely by reference to the instruments in accordance with 14 CFR § 61.412. I have determined that they are proficient and authorized to provide training on control and maneuvering an airplane solely by reference to the flight instruments to this instructor’s sport pilot candidate, who intends to operate an aircraft with a VH greater than 87 KCAS on a cross-country flight.",
    placeholders: ["student_name"],
  },
  {
    code: "A.58",
    title: "A.58 Spin training",
    regulationRefs: "14 CFR § 61.405(b)(1)(ii). This spin training endorsement is only required for flight instructor airplane and flight instructor glider applicants.",
    category: "Sport Pilot Instructor",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.405(b)(1)(ii). I have determined that they are competent and possess instructional proficiency in stall awareness, spin entry, spins, and spin recovery procedures.",
    placeholders: ["student_name"],
  },
  {
    code: "A.59",
    title: "A.59 Ground instructor who does not meet the recent experience requirements",
    regulationRefs: "14 CFR § 61.217(d). This endorsement is issued by an authorized instructor (ground or flight) as defined in 14 CFR § 61.1(b).",
    category: "Ground Instructor",
    body: "I certify that {{student_name}} has demonstrated knowledge in the subject areas prescribed for a {{ground_instructor_grade}} ground instructor under 14 CFR § 61.213(a)(3) and (a)(4), as appropriate.",
    placeholders: ["student_name", "ground_instructor_grade"],
  },
  {
    code: "A.60",
    title: "A.60 R-22/R-44 ground training",
    regulationRefs: "SFAR 73, section 2(a)(1) or (2).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} has received the ground training required by SFAR 73, section 2(a)(3)(i)–(v).",
    placeholders: ["student_name_and_certificate"],
  },
  {
    code: "A.61",
    title: "A.61 R-22 solo endorsement",
    regulationRefs: "SFAR 73, section 2(b)(3).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} meets the experience requirements of SFAR 73, section 2(b)(3) and has been given training specified by SFAR 73, section 2(b)(3)(i)–(iv). They have been found proficient to solo the R-22 helicopter.",
    placeholders: ["student_name_and_certificate"],
  },
  {
    code: "A.62",
    title: "A.62 R-22 PIC endorsement",
    regulationRefs: "SFAR 73, section 2(b)(1)(ii).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} has been given training specified by SFAR 73, section 2(b)(1)(ii)(A)–(D) for Robinson R-22 helicopters and is proficient to act as pilot in command. An annual flight review must be completed by {{annual_review_due_date}} unless the requirements of SFAR 73, section 2(b)(1)(i) are met.",
    placeholders: ["student_name_and_certificate", "annual_review_due_date"],
  },
  {
    code: "A.63",
    title: "A.63 R-22 flight instructor endorsement",
    regulationRefs: "SFAR 73, section 2(b)(5)(iv). This endorsement may only be issued by an FAA aviation safety inspector (ASI) or authorized designated examiner per SFAR 73, section 2(b)(5)(iv).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the experience requirements and has completed the flight training specified by SFAR 73, section 2(b)(5)(i)–(ii) and (iii)(A)–(D), and has demonstrated an ability to provide instruction on the general subject areas of SFAR 73, section 2(a)(3) and the flight training identified in SFAR 73, section 2(b)(5)(iii) in a Robinson R-22 helicopter.",
    placeholders: ["student_name", "cfi_certificate_number"],
  },
  {
    code: "A.64",
    title: "A.64 Flight review in an R-22 helicopter",
    regulationRefs: "SFAR 73, section 2(c)(1) and (3).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} has satisfactorily completed the flight review in an R-22 required by 14 CFR § 61.56 and SFAR 73, section 2(c)(1) and (3), on {{date}}.",
    placeholders: ["student_name_and_certificate", "date"],
  },
  {
    code: "A.65",
    title: "A.65 R-44 solo endorsement",
    regulationRefs: "SFAR 73, section 2(b)(4).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} meets the experience requirements of SFAR 73, section 2(b)(4) and has been given training specified by SFAR 73, section 2(b)(4)(i)–(iv). They have been found proficient to solo the R-44 helicopter.",
    placeholders: ["student_name_and_certificate"],
  },
  {
    code: "A.66",
    title: "A.66 R-44 PIC endorsement",
    regulationRefs: "SFAR 73, section 2(b)(2)(ii).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} has been given training specified by SFAR 73, section 2(b)(2)(ii)(A)–(D) for Robinson R-44 helicopters and is proficient to act as pilot in command. An annual flight review must be completed by {{annual_review_due_date}} unless the requirements of SFAR 73, section 2(b)(2)(i) are met.",
    placeholders: ["student_name_and_certificate", "annual_review_due_date"],
  },
  {
    code: "A.67",
    title: "A.67 R-44 flight instructor endorsement",
    regulationRefs: "SFAR 73, section 2(b)(5)(iv). This endorsement may only be issued by an FAA ASI or authorized Designated Pilot Examiner (DPE) per SFAR 73, section 2(b)(5)(iv).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the experience requirements and has completed the flight training specified by SFAR 73, section 2(b)(5)(i)–(ii) and (iii)(A)–(D), and has demonstrated an ability to provide instruction on the general subject areas of SFAR 73, section 2(a)(3) and the flight training identified in SFAR 73, section 2(b)(5)(iii) in a Robinson R-44 helicopter.",
    placeholders: ["student_name", "cfi_certificate_number"],
  },
  {
    code: "A.68",
    title: "A.68 Flight review in an R-44 helicopter",
    regulationRefs: "SFAR 73, section 2(c)(2) and (3).",
    category: "Robinson SFAR 73",
    body: "I certify that {{student_name_and_certificate}} has satisfactorily completed the flight review in an R-44 required by 14 CFR § 61.56 and SFAR 73, section 2(c)(2) and (3), on {{date}}.",
    placeholders: ["student_name_and_certificate", "date"],
  },
  {
    code: "A.69",
    title: "A.69 Completion of a flight review",
    regulationRefs: "14 CFR § 61.56(a) and (c). No logbook entry reflecting unsatisfactory performance on a flight review is required.",
    category: "Flight Review / IPC",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed a flight review of 14 CFR § 61.56(a) on {{date}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "date"],
  },
  {
    code: "A.70",
    title: "A.70 Completion of any phase of an FAA-sponsored Pilot Proficiency Program (WINGS)",
    regulationRefs: "14 CFR § 61.56(e).",
    category: "Flight Review / IPC",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed Level: {{wings_level}}, PHASE NO. {{wings_phase}} OF A WINGS PROGRAM ON {{date}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "wings_level", "wings_phase", "date"],
  },
  {
    code: "A.71",
    title: "A.71 Completion of an instrument proficiency check (IPC)",
    regulationRefs: "14 CFR § 61.57(d). No logbook entry reflecting unsatisfactory performance on an IPC is required.",
    category: "Flight Review / IPC",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the instrument proficiency check of 14 CFR § 61.57(d) in a {{make_model}} aircraft on {{date}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model", "date"],
  },
  {
    code: "A.72",
    title: "A.72 To act as PIC in a complex airplane",
    regulationRefs: "14 CFR § 61.31(e).",
    category: "Complex / HP / Tailwheel / Solo",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.31(e) in a {{make_model}} complex airplane. I have determined that they are proficient in the operation and systems of a complex airplane.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model"],
  },
  {
    code: "A.73",
    title: "A.73 To act as PIC in a high-performance airplane",
    regulationRefs: "14 CFR § 61.31(f).",
    category: "Complex / HP / Tailwheel / Solo",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.31(f) in a {{make_model}} high-performance airplane. I have determined that they are proficient in the operation and systems of a high-performance airplane.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model"],
  },
  {
    code: "A.74",
    title: "A.74 To act as PIC in a pressurized aircraft capable of high-altitude operations",
    regulationRefs: "14 CFR § 61.31(g).",
    category: "Complex / HP / Tailwheel / Solo",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.31(g) in a {{make_model}} pressurized aircraft. I have determined that they are proficient in the operation and systems of a pressurized aircraft.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model"],
  },
  {
    code: "A.75",
    title: "A.75 To act as PIC in a tailwheel airplane",
    regulationRefs: "14 CFR § 61.31(i). This endorsement may be given in a sport pilot aircraft by a sport pilot instructor or in an airplane by a flight instructor with a rating other than a sport pilot rating.",
    category: "Complex / HP / Tailwheel / Solo",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.31(i) in a {{make_model}} of tailwheel airplane. I have determined that they are proficient in the operation of a tailwheel airplane.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model"],
  },
  {
    code: "A.76",
    title: "A.76 To act as PIC of an aircraft in solo operations when the pilot does not hold an appropriate category/class rating",
    regulationRefs: "14 CFR § 61.31(d)(2).",
    category: "Complex / HP / Tailwheel / Solo",
    body: "I certify that {{student_name}} has received the training as required by 14 CFR § 61.31(d)(2) to serve as a pilot in command in a {{category_class}} of aircraft. I have determined that they are prepared to solo that {{make_model}} aircraft. Limitations: {{limitations}}.",
    placeholders: ["student_name", "category_class", "make_model", "limitations"],
  },
  {
    code: "A.77",
    title: "A.77 Retesting after failure of a knowledge or practical test",
    regulationRefs: "14 CFR § 61.49. In the case of a failed knowledge test, the instructor may complete the endorsement in the space provided at the bottom of the applicant’s Airman Knowledge Test Report (AKTR). The instructor must sign the block provided for the instructor’s recommendation on the reverse side of FAA Form 8710-1, Airman Certificate and/or Rating Application, for each retake of a practical test.",
    category: "Additional Ratings",
    body: "I certify that {{student_name}} has received the additional {{flight_and_or_ground}} training as required by 14 CFR § 61.49. I have determined that they are proficient to pass the {{test_name}} knowledge/practical test.",
    placeholders: ["student_name", "flight_and_or_ground", "test_name"],
  },
  {
    code: "A.78",
    title: "A.78 Additional aircraft category or class rating (other than ATP)",
    regulationRefs: "14 CFR § 61.63(b) or (c).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training for an additional {{aircraft_category_class_rating}}. I have determined that they are prepared for the {{test_name}} practical test for the addition of a {{specific_category_class_type}} type rating.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "aircraft_category_class_rating", "test_name", "specific_category_class_type"],
  },
  {
    code: "A.79",
    title: "A.79 Type rating only, already holds the appropriate category or class rating (other than ATP)",
    regulationRefs: "14 CFR § 61.63(d)(2).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.63(d)(2) for an addition of a {{type_rating}} type rating.",
    placeholders: ["student_name", "type_rating"],
  },
  {
    code: "A.80",
    title: "A.80 Type rating concurrently with an additional category or class rating (other than ATP)",
    regulationRefs: "14 CFR § 61.63(d)(2).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.63(d)(2) for an addition of a {{specific_category_class_type}} type rating. I have determined that they are prepared for the {{test_name}} practical test for the addition of a {{specific_category_class_type}} type rating.",
    placeholders: ["student_name", "specific_category_class_type", "test_name"],
  },
  {
    code: "A.81",
    title: "A.81 Type rating only, already holds the appropriate category or class rating (at the ATP level)",
    regulationRefs: "14 CFR § 61.157(b)(2).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.157(b)(2) for an addition of a {{type_rating}} type rating.",
    placeholders: ["student_name", "type_rating"],
  },
  {
    code: "A.82",
    title: "A.82 Type rating concurrently with an additional category or class rating (at the ATP level)",
    regulationRefs: "14 CFR § 61.157(b)(2).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}} has received the required training of 14 CFR § 61.157(b)(2) for an addition of a {{specific_category_class_type}} type rating.",
    placeholders: ["student_name", "specific_category_class_type"],
  },
  {
    code: "A.83",
    title: "A.83 Launch procedures for operating a glider",
    regulationRefs: "14 CFR § 61.31(j).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training in a glider {{make_model}} for {{launch_procedure}} procedure. I have determined that they are proficient in {{launch_procedure}} procedure.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model", "launch_procedure"],
  },
  {
    code: "A.84",
    title: "A.84 Glider and unpowered ultralight vehicle towing experience",
    regulationRefs: "14 CFR § 61.69(a)(5). This endorsement is made by the pilot who is qualified per 14 CFR § 61.69(c) and (d) and who conducted the flights. This endorsement does not have to be made by a flight instructor.",
    category: "Additional Ratings",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has accomplished at least three flights in an aircraft while towing {{towing_activity}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "towing_activity"],
  },
  {
    code: "A.85",
    title: "A.85 Glider and unpowered ultralight vehicle towing ground and flight",
    regulationRefs: "14 CFR § 61.69(a)(3).",
    category: "Additional Ratings",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required ground and flight training in {{towing_vehicle}}. I have determined that they are proficient in the techniques and procedures essential to the safe towing of {{towed_vehicle}}, including airspeed limitations, emergency procedures, signals used, and maximum angles of bank.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "towing_vehicle", "towed_vehicle"],
  },
  {
    code: "A.86",
    title: "A.86 Review of a home-study curriculum",
    regulationRefs: "14 CFR § 61.35(a)(1).",
    category: "Additional Ratings",
    body: "I certify I have reviewed the home-study curriculum of {{student_name}}. I have determined that they are prepared for the {{test_name}} knowledge test.",
    placeholders: ["student_name", "test_name"],
  },
  {
    code: "A.87",
    title: "A.87 Aeronautical experience credit—ultralight vehicles",
    regulationRefs: "14 CFR § 61.52.",
    category: "Additional Ratings",
    body: "I certify that I have reviewed the records of {{student_name}}, as required by 14 CFR § 61.52(c). I have determined that they may use {{hours}} aeronautical experience obtained in an ultralight vehicle to meet the requirements for {{certificate_or_rating}}.",
    placeholders: ["student_name", "hours", "certificate_or_rating"],
  },
  {
    code: "A.88",
    title: "A.88 Endorsement required for ground training to act as PIC of an aircraft using night vision goggles (NVG)",
    regulationRefs: "14 CFR § 61.31(k)(1). This training and endorsement must be given by an authorized instructor, which is one who meets the requirements of 14 CFR § 61.195(k)(1)–(7). Refer to 14 CFR § 61.31(k)(3) for exceptions to this required ground training.",
    category: "NVG",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the ground training required by 14 CFR § 61.31(k)(1), (i) through (v) to conduct night vision goggle operations.",
    placeholders: ["student_name", "certificate_grade", "certificate_number"],
  },
  {
    code: "A.89",
    title: "A.89 Endorsement required for flight training and statement of proficiency to act as PIC of an aircraft using NVG",
    regulationRefs: "14 CFR § 61.31(k)(2). This training and endorsement must be given by an authorized instructor, which is one who meets the requirements of 14 CFR § 61.195(k)(1)–(7). Refer to 14 CFR § 61.31(k)(3) for exceptions to this required flight training.",
    category: "NVG",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the flight training on night vision goggle operations required by 14 CFR § 61.31(k)(2), (i) through (iv). I find them proficient in the use of night vision goggles.",
    placeholders: ["student_name", "certificate_grade", "certificate_number"],
  },
  {
    code: "A.90",
    title: "A.90 Endorsement required to provide training for NVGOs",
    regulationRefs: "14 CFR § 61.195(k)(7). “Position,” as mentioned in the signature block of the endorsement, is a person who is authorized by the FAA to provide that logbook endorsement. Refer to FAA Order 8900.1, Flight Standards Information Management System.",
    category: "NVG",
    body: "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the night vision goggle instructor requirements of 14 CFR § 61.195(k) and is authorized to perform the night vision goggle pilot-in-command qualification and recent flight experience requirements under 14 CFR §§ 61.31(k) and 61.57(f) and (g). This endorsement does not provide the authority to endorse another flight instructor as a night vision goggle instructor.",
    placeholders: ["student_name", "cfi_certificate_number"],
  },
  {
    code: "A.91",
    title: "A.91 Endorsement for EFVS ground training",
    regulationRefs: "14 CFR § 61.66(a).",
    category: "EFVS",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the ground training required by 14 CFR § 61.66(a) appropriate to the {{aircraft_category}} category of aircraft.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "aircraft_category"],
  },
  {
    code: "A.92",
    title: "A.92 Endorsement for EFVS flight training",
    regulationRefs: "14 CFR § 61.66(b).",
    category: "EFVS",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the flight training required by 14 CFR § 61.66(b) and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "aircraft_category", "efvs_operation"],
  },
  {
    code: "A.93",
    title: "A.93 Endorsement for EFVS ground and flight training",
    regulationRefs: "14 CFR § 61.66(a) and (b).",
    category: "EFVS",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the ground training required by 14 CFR § 61.66(a) and has received the flight training required by 14 CFR § 61.66(b) for EFVS operations and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "aircraft_category", "efvs_operation"],
  },
  {
    code: "A.94",
    title: "A.94 Endorsement for EFVS supplementary training",
    regulationRefs: "14 CFR § 61.66(c).",
    category: "EFVS",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the required ground and flight training required by 14 CFR § 61.66(c) for EFVS operations and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "aircraft_category", "efvs_operation"],
  },
  {
    code: "A.95",
    title: "A.95 To act as PIC in an aircraft with a simplified flight controls designation",
    regulationRefs: "14 CFR §§ 61.31(l) and 61.45(h)(1).",
    category: "Simplified Flight Controls",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.31(l)(1) in a {{make_model}} aircraft with simplified flight controls designation. I have determined that {{student_name}} is proficient in the operation of an {{category_class_make_model}} aircraft with simplified flight controls.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model", "category_class_make_model"],
  },
  {
    code: "A.96",
    title: "A.96 Initial cadre training in an aircraft with simplified flight controls",
    regulationRefs: "14 CFR § 61.195(n).",
    category: "Simplified Flight Controls",
    body: "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of 14 CFR § 61.195(n)(2)(ii) in a {{make_model}} aircraft with simplified flight controls designation. I have determined that {{student_name}} is proficient in the operation of an {{category_class_make_model}} aircraft with simplified flight controls.",
    placeholders: ["student_name", "certificate_grade", "certificate_number", "make_model", "category_class_make_model"],
  },

]

export const ENDORSEMENT_CATEGORIES: EndorsementCategory[] = [
  ...new Set(ENDORSEMENT_CATALOG.map((e) => e.category)),
] as EndorsementCategory[]

const PLACEHOLDER_RE = /\{\{([a-z0-9_]+)\}\}/g

export function parseEndorsementTemplateCode(code: string): {
  edition: EndorsementCatalogEdition
  code: string
} {
  const trimmed = code.trim()
  if (trimmed.toUpperCase().startsWith(LEGACY_ENDORSEMENT_CODE_PREFIX.toUpperCase())) {
    return {
      edition: '61-65H',
      code: trimmed.slice(LEGACY_ENDORSEMENT_CODE_PREFIX.length),
    }
  }
  return { edition: '61-65K', code: trimmed }
}

export function getEndorsementTemplate(
  code: string,
  options?: { edition?: EndorsementCatalogEdition }
): EndorsementTemplate | undefined {
  const parsed = parseEndorsementTemplateCode(code)
  const edition = options?.edition ?? parsed.edition
  const lookup = parsed.code
  if (edition === '61-65H') {
    return LEGACY_ENDORSEMENT_CATALOG.find((e) => e.code === lookup)
  }
  return ENDORSEMENT_CATALOG.find((e) => e.code === lookup)
}

export function listEndorsementPlaceholders(body: string): string[] {
  const set = new Set<string>()
  for (const m of body.matchAll(PLACEHOLDER_RE)) set.add(m[1])
  return [...set]
}

export function renderEndorsementBody(
  templateBody: string,
  fields: Record<string, string>
): string {
  return templateBody.replace(PLACEHOLDER_RE, (_, key: string) => {
    const val = fields[key]
    return val != null && String(val).trim() !== '' ? String(val).trim() : `{{${key}}}`
  })
}

export function missingEndorsementFields(
  templateBody: string,
  fields: Record<string, string>
): string[] {
  return listEndorsementPlaceholders(templateBody).filter((key) => {
    const val = fields[key]
    return val == null || String(val).trim() === ''
  })
}

export function computeEndorsementExpiresAt(
  template: Pick<EndorsementTemplate, 'validityDays'>,
  from: Date = new Date()
): string | null {
  if (!template.validityDays || template.validityDays <= 0) return null
  const d = new Date(from.getTime())
  d.setUTCDate(d.getUTCDate() + template.validityDays)
  return d.toISOString()
}

export function placeholderLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** PDF scrape leftovers that must never appear in issuable template bodies. */
export function endorsementBodyHasScrapeArtifacts(body: string): boolean {
  return (
    /\bAppendix\b/i.test(body) ||
    /\bENDORSEMENTS\b/.test(body) ||
    /\bA-\d+\b/.test(body) ||
    /\b11\/14\/25\b/.test(body) ||
    /\bAC 61-65K\b/.test(body)
  )
}

/** True when a from/to route uses the same airport placeholder on both ends. */
export function endorsementRouteReusesAirportPlaceholder(body: string): boolean {
  const match = body.match(/from \{\{(\w+)\}\} to \{\{(\w+)\}\}/i)
  return Boolean(match && match[1] === match[2])
}
