/**
 * AC 61-65H Appendix A sample endorsement catalog (Aug 2018).
 * Catalog texts are snapshotted onto endorsement rows at create/sign time.
 * Bump catalogVersion when template wording changes.
 */
export const ENDORSEMENT_CATALOG_VERSION = '61-65H-2018-08'

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

export const ENDORSEMENT_CATALOG: EndorsementTemplate[] = [
  {
    "code": "A.1",
    "title": "A.1 Prerequisites for practical test",
    "regulationRefs": "Title 14 of the Code of Federal Regulations (14 CFR) part 61, § 61.39(a)(6)(i) and (ii).",
    "category": "Practical Test Prerequisites",
    "body": "I certify that {{student_name}} has received and logged training time within 2 calendar-months preceding the month of application in preparation for the practical test and {{he_or_she}} is prepared for the required practical test for the issuance of {{certificate_or_rating}} certificate.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "certificate_or_rating"
    ]
  },
  {
    "code": "A.2",
    "title": "A.2 Review of deficiencies identified on airman knowledge test",
    "regulationRefs": "§ 61.39(a)(6)(iii), as required.",
    "category": "Practical Test Prerequisites",
    "body": "I certify that {{student_name}} has demonstrated satisfactory knowledge of the subject areas in which {{he_or_she}} was deficient on the {{certificate_or_rating}} airman knowledge test. STUDENT PILOT ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "certificate_or_rating"
    ]
  },
  {
    "code": "A.3",
    "title": "A.3 Pre-solo aeronautical knowledge",
    "regulationRefs": "§ 61.87(b).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has satisfactorily completed the pre-solo knowledge test of § 61.87(b) for the {{make_model}} aircraft.",
    "placeholders": [
      "student_name",
      "make_model"
    ]
  },
  {
    "code": "A.4",
    "title": "A.4 Pre-solo flight training",
    "regulationRefs": "§ 61.87(c)(1) and (2).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received and logged pre-solo flight training for the maneuvers and procedures that are appropriate to the {{make_model}} aircraft. I have determined {{he_or_she}} has demonstrated satisfactory proficiency and safety on the maneuvers and procedures required by § 61.87 in this or similar make and model of aircraft to be flown.",
    "placeholders": [
      "student_name",
      "make_model",
      "he_or_she"
    ]
  },
  {
    "code": "A.5",
    "title": "A.5 Pre-solo flight training at night",
    "regulationRefs": "§ 61.87(o).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received flight training at night on night flying procedures that include takeoffs, approaches, landings, and go-arounds at night at the {{airport}} airport where the solo flight will be conducted; navigation training at night in the vicinity of the {{airport}} airport where the solo flight will be conducted. This endorsement expires 90 calendar-days from the date the flight training at night was received.",
    "placeholders": [
      "student_name",
      "airport"
    ],
    "validityDays": 90
  },
  {
    "code": "A.6",
    "title": "A.6 Solo flight (first 90 calendar-day period)",
    "regulationRefs": "§ 61.87(n).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training to qualify for solo flying. I have determined {{he_or_she}} meets the applicable requirements of § 61.87(n) and is proficient to make solo flights in {{make_model}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "make_model"
    ],
    "validityDays": 90
  },
  {
    "code": "A.7",
    "title": "A.7 Solo flight (each additional 90 calendar-day period)",
    "regulationRefs": "§ 61.87(p).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training to qualify for solo flying. I have determined that {{he_or_she}} meets the applicable requirements of § 61.87(p) and is proficient to make solo flights in {{make_model}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "make_model"
    ],
    "validityDays": 90
  },
  {
    "code": "A.8",
    "title": "A.8 Solo takeoffs and landings at another airport within 25 nautical miles (NM)",
    "regulationRefs": "§ 61.93(b)(1).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training of § 61.93(b)(1). I have determined that {{he_or_she}} is proficient to practice solo takeoffs and landings at {{airport}}. The takeoffs and landings at {{airport}} are subject to the following conditions: {{limitations}}",
    "placeholders": [
      "student_name",
      "he_or_she",
      "airport",
      "limitations"
    ]
  },
  {
    "code": "A.9",
    "title": "A.9 Solo cross-country flight",
    "regulationRefs": "§ 61.93(c)(1) and (2).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required solo cross-country training. I find {{he_or_she}} has met the applicable requirements of § 61.93, and is proficient to make solo cross-country flights in a {{make_model}} aircraft, {{aircraft_category}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "make_model",
      "aircraft_category"
    ]
  },
  {
    "code": "A.10",
    "title": "A.10 Solo cross-country flight",
    "regulationRefs": "§ 61.93(c)(3).",
    "category": "Student Solo",
    "body": "I have reviewed the cross-country planning of {{student_name}}. I find the planning and preparation to be correct to make the solo flight from {{departure_airport}} to {{departure_airport}} via {{route}} with landings at {{landing_airports}} in a {{make_model}} aircraft on {{date}}. {{limitations}} Appendix A A-8",
    "placeholders": [
      "student_name",
      "departure_airport",
      "route",
      "landing_airports",
      "make_model",
      "date",
      "limitations"
    ]
  },
  {
    "code": "A.11",
    "title": "A.11 Repeated solo cross-country flights not more than 50 NM from the point of departure",
    "regulationRefs": "§ 61.93(b)(2).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training in both directions between and at both {{airport_names}}. I have determined that {{he_or_she}} is proficient of § 61.93(b)(2) to conduct repeated solo cross-country flights over that route, subject to the following conditions: {{limitations}}",
    "placeholders": [
      "student_name",
      "airport_names",
      "he_or_she",
      "limitations"
    ]
  },
  {
    "code": "A.12",
    "title": "A.12 Solo flight in Class B airspace",
    "regulationRefs": "§ 61.95(a).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training of § 61.95(a). I have determined {{he_or_she}} is proficient to conduct solo flights in {{class_b_name}} airspace. {{limitations}}",
    "placeholders": [
      "student_name",
      "he_or_she",
      "class_b_name",
      "limitations"
    ]
  },
  {
    "code": "A.13",
    "title": "A.13 Solo flight to, from, or at an airport located in Class B airspace",
    "regulationRefs": "§ 61.95(b) and 14 CFR part 91, § 91.131(b)(1).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has received the required training of § 61.95(b)(1). I have determined that {{he_or_she}} is proficient to conduct solo flight operations at {{airport}}. {{limitations}}",
    "placeholders": [
      "student_name",
      "he_or_she",
      "airport",
      "limitations"
    ]
  },
  {
    "code": "A.14",
    "title": "A.14 Endorsement of U.S. citizenship recommended by the Transportation Security Administration (TSA)",
    "regulationRefs": "Title 49 of the Code of Federal Regulations (49 CFR) § 1552.3(h).",
    "category": "Student Solo",
    "body": "I certify that {{student_name}} has presented me a {{citizenship_document}} establishing that {{he_or_she}} is a U.S. citizen or national in accordance with 49 CFR § 1552.3(h). ADDITIONAL STUDENT PILOT ENDORSEMENTS FOR STUDENTS SEEKING SPORT OR RECREATIONAL PILOT CERTIFICATES",
    "placeholders": [
      "student_name",
      "citizenship_document",
      "he_or_she"
    ]
  },
  {
    "code": "A.15",
    "title": "A.15 Solo flight in Class B, C, and D airspace",
    "regulationRefs": "§ 61.94(a).",
    "category": "Student Sport/Recreational",
    "body": "I certify that {{student_name}} has received the required training of § 61.94(a). I have determined {{he_or_she}} is proficient to conduct solo flights in {{airspace_name}} airspace and authorized to operate to, from through and at {{airport}}. {{limitations}} Appendix A A-9",
    "placeholders": [
      "student_name",
      "he_or_she",
      "airspace_name",
      "airport",
      "limitations"
    ]
  },
  {
    "code": "A.16",
    "title": "A.16 Solo flight to, from, or at an airport located in Class B, C, or D airspace or at an airport having an operational control tower",
    "regulationRefs": "§§ 61.94(a) and 91.131(b)(1).",
    "category": "Student Sport/Recreational",
    "body": "I certify that {{student_name}} has received the required training of § 61.94(a)(1). I have determined that {{he_or_she}} is proficient to conduct solo flight operations at {{airport}}. {{limitations}} SPORT PILOT ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "airport",
      "limitations"
    ]
  },
  {
    "code": "A.17",
    "title": "A.17 Aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1) and 61.309.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the required aeronautical knowledge training of § 61.309. I have determined that {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.18",
    "title": "A.18 Taking flight proficiency check for different category or class of aircraft",
    "regulationRefs": "§§ 61.309 and 61.311.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the required training required in accordance with §§ 61.309 and 61.311 and have determined that {{he_or_she}} is prepared for the {{test_name}} proficiency check.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.19",
    "title": "A.19 Passing flight proficiency check for different category or class of aircraft",
    "regulationRefs": "§§ 61.309 and 61.311.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has met the requirements of §§ 61.309 and 61.311 and I have determined {{him_or_her}} proficient to act as pilot in command of {{category_class}} of light-sport aircraft.",
    "placeholders": [
      "student_name",
      "him_or_her",
      "category_class"
    ]
  },
  {
    "code": "A.20",
    "title": "A.20 Taking sport pilot practical test",
    "regulationRefs": "§§ 61.309, 61.311, and 61.313.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the training required in accordance with §§ 61.309 and 61.311 and met the aeronautical experience requirements of § 61.313. I have determined that {{he_or_she}} is prepared for the {{test_type}} practical test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_type"
    ]
  },
  {
    "code": "A.21",
    "title": "A.21 Passing a sport pilot practical test",
    "regulationRefs": "§§ 61.309, 61.311, and 61.313.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has met the requirements of §§ 61.309, 61.311, and 61.313, and I have determined {{him_or_her}} proficient to act as pilot in command of {{category_class}} light-sport aircraft.",
    "placeholders": [
      "student_name",
      "him_or_her",
      "category_class"
    ]
  },
  {
    "code": "A.22",
    "title": "A.22 Class B, C, or D airspace, at an airport located in Class B, C, or D airspace, or to, from, through, or at an airport having an operational control tower",
    "regulationRefs": "§ 61.325.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.325. I have determined {{he_or_she}} is proficient to conduct operations in Class B, C, or D airspace, at an airport located in Class B, C, or D airspace, or to, from, through, or at an airport having an operational control tower.",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.23",
    "title": "A.23 Light-sport aircraft that has a maximum speed in level flight with maximum continuous power (VH) less than or equal to 87 Knots Calibrated Airspeed (KCAS)",
    "regulationRefs": "§ 61.327.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the required training required in accordance with § 61.327(a) in a {{make_model}} aircraft. I have determined {{him_or_her}} proficient to act as pilot in command of a light-sport aircraft that has a VH less than or equal to 87 KCAS.",
    "placeholders": [
      "student_name",
      "make_model",
      "him_or_her"
    ]
  },
  {
    "code": "A.24",
    "title": "A.24 Light-sport aircraft that has a VH greater than 87 KCAS",
    "regulationRefs": "§ 61.327.",
    "category": "Sport Pilot",
    "body": "I certify that {{student_name}} has received the required training required in accordance with § 61.327(b) in a {{make_model}} aircraft. I have determined {{him_or_her}} proficient to act as pilot in command of a light-sport aircraft that has a VH greater than 87 KCAS. RECREATIONAL PILOT ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "make_model",
      "him_or_her"
    ]
  },
  {
    "code": "A.25",
    "title": "A.25 Aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1), 61.96(b)(3), and 61.97(b).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.97(b). I have determined that {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.26",
    "title": "A.26 Flight proficiency/practical test",
    "regulationRefs": "§§ 61.96(b)(5), 61.98(a) and (b), and 61.99.",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required training of §§ 61.98(b) and 61.99. I have determined that {{he_or_she}} is prepared for the {{test_name}} practical test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.27",
    "title": "A.27 Recreational pilot to operate within 50 NM of the airport where training was received",
    "regulationRefs": "§ 61.101(b).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.101(b). I have determined that {{he_or_she}} is competent to operate at the {{name_of_airport}}. Appendix A A-11",
    "placeholders": [
      "student_name",
      "he_or_she",
      "name_of_airport"
    ]
  },
  {
    "code": "A.28",
    "title": "A.28 Recreational pilot to act as pilot in command on a flight that exceeds 50 NM of the departure airport",
    "regulationRefs": "§ 61.101(c).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required cross-country training of § 61.101(c). I have determined that {{he_or_she}} is proficient in cross-country flying of part 61 subpart E.",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.29",
    "title": "A.29 Recreational pilot with less than 400 flight hours and no logged pilot in command time within the preceding 180 calendar-days",
    "regulationRefs": "§ 61.101(g).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required 180-day recurrent training of § 61.101(g) in a {{make_model}} aircraft. I have determined {{him_or_her}} proficient to act as pilot in command of that aircraft.",
    "placeholders": [
      "student_name",
      "make_model",
      "him_or_her"
    ]
  },
  {
    "code": "A.30",
    "title": "A.30 Recreational pilot to conduct solo flights for the purpose of obtaining an additional certificate or rating while under the supervision of an authorized flight instructor",
    "regulationRefs": "§ 61.101(j).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.87 in a {{make_model}} aircraft. I have determined {{he_or_she}} is prepared to conduct a solo flight on {{date}} under the following conditions: {{limitations}}",
    "placeholders": [
      "student_name",
      "make_model",
      "he_or_she",
      "date",
      "limitations"
    ]
  },
  {
    "code": "A.31",
    "title": "A.31 Class B, C, or D airspace, at an airport located in Class B, C, or D airspace, or to, from, through, or at an airport having an operational control tower",
    "regulationRefs": "§ 61.101(d).",
    "category": "Recreational Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.101(d). I have determined {{he_or_she}} is proficient to conduct operations in Class B, C, or D airspace, at an airport located in Class B, C, or D airspace, or to, from, through, or at an airport having an operational control tower. PRIVATE PILOT ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.32",
    "title": "A.32 Aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1), 61.103(d), and 61.105.",
    "category": "Private Pilot",
    "body": "I certify that {{student_name}} has received the required training in accordance with § 61.105. I have determined {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.33",
    "title": "A.33 Flight proficiency/practical test",
    "regulationRefs": "§§ 61.103(f), 61.107(b), and 61.109.",
    "category": "Private Pilot",
    "body": "I certify that {{student_name}} has received the required training in accordance with §§ 61.107 and 61.109. I have determined {{he_or_she}} is prepared for the {{test_name}} practical test. Appendix A A-12 COMMERCIAL PILOT ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.34",
    "title": "A.34 Aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1), 61.123(c), and 61.125.",
    "category": "Commercial Pilot",
    "body": "I certify that {{student_name}} has received the required training of § 61.125. I have determined that {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.35",
    "title": "A.35 Flight proficiency/practical test",
    "regulationRefs": "§§ 61.123(e), 61.127, and 61.129.",
    "category": "Commercial Pilot",
    "body": "I certify that {{student_name}} has received the required training of §§ 61.127 and 61.129. I have determined that {{he_or_she}} is prepared for the {{test_name}} practical test. AIRLINE TRANSPORT PILOT (ATP) ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.36",
    "title": "A.36 Restricted privileges ATP Certificate, Airplane Multiengine Land (AMEL) rating",
    "regulationRefs": "§ 61.160. This certifying statement can only be provided by an authorized institution of higher education in accordance with its letter of authorization (LOA). Refer to AC 61-139, Institution of Higher Education’s Application for Authority to Certify its Graduates for an Airline Transport Pilot Certificate with Reduced Aeronautical Experience.",
    "category": "Airline Transport Pilot",
    "body": "The {{institution_name}} certifies that the recipient of this degree has successfully completed all of the aviation coursework requirements of § 61.160{{section_paragraph}} and therefore meets the academic eligibility requirements of § 61.160{{section_paragraph}}.",
    "placeholders": [
      "institution_name",
      "section_paragraph"
    ]
  },
  {
    "code": "A.37",
    "title": "A.37 ATP Certification Training Program (CTP)",
    "regulationRefs": "§ 61.153(e).",
    "category": "Airline Transport Pilot",
    "body": "The applicant named above has successfully completed the Airline Transport Pilot Certification Training Program as required by § 61.156, and therefore has met the prerequisite required by § 61.35(a)(2) for the Airline Transport Pilot Multiengine Airplane Knowledge Test. INSTRUMENT RATING ENDORSEMENTS",
    "placeholders": []
  },
  {
    "code": "A.38",
    "title": "A.38 Aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1) and 61.65(a) and (b).",
    "category": "Instrument",
    "body": "I certify that {{student_name}} has received the required training of § 61.65(b). I have determined that {{he_or_she}} is prepared for the Instrument–{{instrument_category}} knowledge test. Appendix A A-13",
    "placeholders": [
      "student_name",
      "he_or_she",
      "instrument_category"
    ]
  },
  {
    "code": "A.39",
    "title": "A.39 Flight proficiency/practical test",
    "regulationRefs": "§ 61.65(a)(6).",
    "category": "Instrument",
    "body": "I certify that {{student_name}} has received the required training of § 61.65(c) and (d). I have determined {{he_or_she}} is prepared for the Instrument–{{airplane_helicopter_or_powered_lift}} practical test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "airplane_helicopter_or_powered_lift"
    ]
  },
  {
    "code": "A.40",
    "title": "A.40 Prerequisites for instrument practical tests",
    "regulationRefs": "§ 61.39(a).",
    "category": "Instrument",
    "body": "I certify that {{student_name}} has received and logged the required flight time/training of § 61.39(a) in preparation for the practical test within 2 calendar-months preceding the date of the test and has satisfactory knowledge of the subject areas in which {{he_or_she}} was shown to be deficient by the FAA Airman Knowledge Test Report. I have determined {{he_or_she}} is prepared for the Instrument–{{instrument_category}} practical test. FLIGHT INSTRUCTOR (OTHER THAN FLIGHT INSTRUCTORS WITH A SPORT PILOT RATING) ENDORSEMENTS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "instrument_category"
    ]
  },
  {
    "code": "A.41",
    "title": "A.41 Fundamentals of instructing knowledge test",
    "regulationRefs": "§ 61.183(d).",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received the required fundamentals of instruction training of § 61.185(a)(1). I have determined that {{he_or_she}} is prepared for the Fundamentals of Instructing knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.42",
    "title": "A.42 Flight instructor aeronautical knowledge test",
    "regulationRefs": "§ 61.183(f).",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.185(a){{cfi_knowledge_paragraph}}. I have determined that {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "cfi_knowledge_paragraph",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.43",
    "title": "A.43 Flight instructor ground and flight proficiency/practical test",
    "regulationRefs": "§ 61.183(g).",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.187(b). I have determined that {{he_or_she}} is prepared for the CFI – {{category_class}} practical test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "category_class"
    ]
  },
  {
    "code": "A.44",
    "title": "A.44 Flight instructor certificate with instrument—(category/class) rating/practical test",
    "regulationRefs": "§§ 61.183(g), and 61.187(a) and (b)(7).",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received the required certificated flight instructor – instrument training of § 61.187(b)(7). I have determined {{he_or_she}} is prepared for the certificated flight instructor – instrument – {{instrument_category}} practical test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "instrument_category"
    ]
  },
  {
    "code": "A.45",
    "title": "A.45 Spin training",
    "regulationRefs": "§ 61.183(i)(1). The spin training endorsement is only required of flight instructor airplane and flight instructor glider applicants.",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.183(i) in {{aircraft_type}}. I have determined that {{he_or_she}} is competent and possesses instructional proficiency in stall awareness, spin entry, spins, and spin recovery procedures.",
    "placeholders": [
      "student_name",
      "aircraft_type",
      "he_or_she"
    ]
  },
  {
    "code": "A.46",
    "title": "A.46 Helicopter Touchdown Autorotation",
    "regulationRefs": "FAA-S-8081-7, Flight Instructor Practical Test Standards for Rotorcraft (Helicopter & Gyroplane).",
    "category": "Flight Instructor",
    "body": "I certify that {{student_name}} has received training in straight-in and 180-degree autorotations to include touchdown. I have determined that {{he_or_she}} is competent in instructional knowledge relating to the elements, common errors, performance, and correction of common errors related to straight-in and 180-degree autorotations. FLIGHT INSTRUCTOR WITH A SPORT PILOT RATING ENDORSEMENT",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.47",
    "title": "A.47 Fundamentals of instructing knowledge test",
    "regulationRefs": "§ 61.405(a)(1).",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has received the required training in accordance with § 61.405(a)(1). I have determined that {{he_or_she}} is prepared for the Fundamentals of Instructing Knowledge Test.",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.48",
    "title": "A.48 Sport pilot flight instructor aeronautical knowledge test",
    "regulationRefs": "§§ 61.35(a)(1) and 61.405(a).",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.405(a)(2). I have determined that {{he_or_she}} is prepared for the {{name_of_the_knowledge_test}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "name_of_the_knowledge_test"
    ]
  },
  {
    "code": "A.49",
    "title": "A.49 Flight instructor flight proficiency check to provide training if a different category or class of aircraft–(additional category/class)",
    "regulationRefs": "§§ 61.409 and 61.419.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has received the required training in accordance with §§ 61.409 and 61.419 and have determined that {{he_or_she}} is prepared for a proficiency check for the flight instructor with a sport pilot rating in a {{category_class}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "category_class"
    ]
  },
  {
    "code": "A.50",
    "title": "A.50 Passing the flight instructor flight proficiency check to provide training in a different category or class of aircraft (additional category/class)",
    "regulationRefs": "§§ 61.409 and 61.419.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has met the requirements in accordance with §§ 61.409 and 61.419. I have determined that {{he_or_she}} is proficient and authorized for the additional {{category_class}} flight instructor privilege.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "category_class"
    ]
  },
  {
    "code": "A.51",
    "title": "A.51 Flight instructor practical test",
    "regulationRefs": "§§ 61.409 and 61.411.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.409 and met the aeronautical experience requirements of § 61.411. I have determined that {{he_or_she}} is prepared for the flight instructor with a sport pilot rating practical test in a {{category_class}}.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "category_class"
    ]
  },
  {
    "code": "A.52",
    "title": "A.52 Passing the flight instructor practical test",
    "regulationRefs": "§§ 61.409 and 61.411.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has met the requirements in accordance with §§ 61.409 and 61.411. I have determined that {{he_or_she}} is proficient and authorized for the {{category_class}} flight instructor privilege.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "category_class"
    ]
  },
  {
    "code": "A.53",
    "title": "A.53 Sport pilot instructor to train sport pilots on flight by reference to instruments",
    "regulationRefs": "§ 61.412.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that I have given {{student_name}} 3 hours of flight training and 1 hour of ground instruction specific to providing flight training on control and maneuvering an airplane solely by reference to the instruments in accordance with § 61.412. I have determined that {{he_or_she}} is proficient and authorized to provide training on control and maneuvering an airplane solely by reference to the flight instruments to this instructor’s sport pilot candidate, who intends to operate an LSA airplane with a VH greater than 87 KCAS on a cross-country flight.",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.54",
    "title": "A.54 Spin training",
    "regulationRefs": "§ 61.405(b)(1)(ii). This spin training endorsement is only required for flight instructor airplane and flight instructor glider applicants.",
    "category": "Sport Pilot Instructor",
    "body": "I certify that {{student_name}} has received the required training of § 61.405(b)(1)(ii). I have determined that {{he_or_she}} is competent and possesses instructional proficiency in stall awareness, spin entry, spins, and spin recovery procedures. GROUND INSTRUCTOR ENDORSEMENT",
    "placeholders": [
      "student_name",
      "he_or_she"
    ]
  },
  {
    "code": "A.55",
    "title": "A.55 Ground instructor who does not meet the recent experience requirements",
    "regulationRefs": "§ 61.217(d).",
    "category": "Ground Instructor",
    "body": "I certify that {{student_name}} has demonstrated knowledge in the subject areas prescribed for a (basic, advanced, instrument) ground instructor under § 61.213(a)(3) and (a)(4), as appropriate. SPECIAL FEDERAL AVIATION REGULATION (SFAR) 73, ROBINSON R-22/R-44 SPECIAL TRAINING AND EXPERIENCE REQUIREMENTS, ENDORSEMENTS",
    "placeholders": [
      "student_name"
    ]
  },
  {
    "code": "A.56",
    "title": "A.56 R-22/R-44 awareness training",
    "regulationRefs": "SFAR 73, section 2(a)(1) or (2).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} has received the Awareness Training required by SFAR 73, section 2(a)(3)(i–v).",
    "placeholders": [
      "student_name_and_certificate"
    ]
  },
  {
    "code": "A.57",
    "title": "A.57 R-22 solo endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(3).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} meets the experience requirements of SFAR 73, section 2(b)(3) and has been given training specified by SFAR 73, section 2(b)(3)(i–iv). {{he_or_she}} has been found proficient to solo the R-22 helicopter.",
    "placeholders": [
      "student_name_and_certificate",
      "he_or_she"
    ]
  },
  {
    "code": "A.58",
    "title": "A.58 R-22 pilot-in-command endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(1)(ii).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} has been given training specified by SFAR 73, section 2(b)(1)(ii)(A–D) for Robinson R-22 helicopters and is proficient to act as pilot in command. An annual flight review must be completed by {{annual_review_due_date}} unless the requirements of SFAR 73, section 2(b)(1)(i) are met.",
    "placeholders": [
      "student_name_and_certificate",
      "annual_review_due_date"
    ]
  },
  {
    "code": "A.59",
    "title": "A.59 R-22 flight instructor endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(5)(iv).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the experience requirements, and has completed the flight training specified by SFAR 73, section 2(b)(5)(i–ii) and (iii)(A–D), and has demonstrated an ability to provide instruction on the general subject areas of SFAR 73, section 2(a)(3) and the flight training identified in SFAR 73, section 2(b)(5)(iii) in a Robinson R-22 helicopter.",
    "placeholders": [
      "student_name",
      "cfi_certificate_number"
    ]
  },
  {
    "code": "A.60",
    "title": "A.60 Flight review in an R-22 helicopter",
    "regulationRefs": "SFAR 73, section 2(c)(1) and (3).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} has satisfactorily completed the flight review in an R-22 required by § 61.56 and SFAR 73, section 2(c)(1) and (3), on {{date}}.",
    "placeholders": [
      "student_name_and_certificate",
      "date"
    ]
  },
  {
    "code": "A.61",
    "title": "A.61 R-44 solo endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(4).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} meets the experience requirements of SFAR 73, section 2(b)(4) and has been given training specified by SFAR 73, section 2(b)(4)(i–iv). {{he_or_she}} has been found proficient to solo the R-44 helicopter.",
    "placeholders": [
      "student_name_and_certificate",
      "he_or_she"
    ]
  },
  {
    "code": "A.62",
    "title": "A.62 R-44 pilot-in-command endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(2)(ii).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} has been given training specified by SFAR 73, section 2(b)(2)(ii)(A–D) for Robinson R-44 helicopters and is proficient to act as pilot in command. An annual flight review must be completed by {{annual_review_due_date}} unless the requirements of SFAR 73, section 2(b)(2)(i) are met.",
    "placeholders": [
      "student_name_and_certificate",
      "annual_review_due_date"
    ]
  },
  {
    "code": "A.63",
    "title": "A.63 R-44 flight instructor endorsement",
    "regulationRefs": "SFAR 73, section 2(b)(5)(iv).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the experience requirements and has completed the flight training specified by SFAR 73, section 2(b)(5)(i–ii) and (iii)(A–D), and has demonstrated an ability to provide instruction on the general subject areas of SFAR 73, section 2(a)(3) and the flight training identified in SFAR 73, section 2(b)(5)(iii) in a Robinson R-44 helicopter.",
    "placeholders": [
      "student_name",
      "cfi_certificate_number"
    ]
  },
  {
    "code": "A.64",
    "title": "A.64 Flight review in an R-44 helicopter",
    "regulationRefs": "SFAR 73, section 2(c)(2) and (3).",
    "category": "Robinson SFAR 73",
    "body": "I certify that {{student_name_and_certificate}} has satisfactorily completed the flight review in an R-44 required by 14 CFR, § 61.56 and SFAR 73, section 2(c)(2) and (3), on {{date}}. ADDITIONAL ENDORSEMENTS",
    "placeholders": [
      "student_name_and_certificate",
      "date"
    ]
  },
  {
    "code": "A.65",
    "title": "A.65 Completion of a flight review",
    "regulationRefs": "§ 61.56(a) and (c).",
    "category": "Flight Review / IPC",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed a flight review of § 61.56(a) on {{date}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "date"
    ]
  },
  {
    "code": "A.66",
    "title": "A.66 Completion of any phase of an FAA-sponsored Pilot Proficiency Program (WINGS)",
    "regulationRefs": "§ 61.56(e).",
    "category": "Flight Review / IPC",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed Level: {{wings_level}}, PHASE NO. {{field}} OF A WINGS PROGRAM ON {{date}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "wings_level",
      "field",
      "date"
    ]
  },
  {
    "code": "A.67",
    "title": "A.67 Completion of an instrument proficiency check",
    "regulationRefs": "§ 61.57(d).",
    "category": "Flight Review / IPC",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the instrument proficiency check of § 61.57(d) in a {{make_and_model}} aircraft on {{date}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_and_model",
      "date"
    ]
  },
  {
    "code": "A.68",
    "title": "A.68 To act as pilot in command in a complex airplane",
    "regulationRefs": "§ 61.31(e).",
    "category": "Complex / HP / Tailwheel / Solo",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of § 61.31(e) in a {{make_model}} complex airplane. I have determined that {{he_or_she}} is proficient in the operation and systems of a complex airplane.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_model",
      "he_or_she"
    ]
  },
  {
    "code": "A.69",
    "title": "A.69 To act as pilot in command in a high-performance airplane",
    "regulationRefs": "§ 61.31(f).",
    "category": "Complex / HP / Tailwheel / Solo",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of § 61.31(f) in a {{make_model}} high performance airplane. I have determined that {{he_or_she}} is proficient in the operation and systems of a high-performance airplane.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_model",
      "he_or_she"
    ]
  },
  {
    "code": "A.70",
    "title": "A.70 To act as pilot in command in a pressurized aircraft capable of high-altitude operations",
    "regulationRefs": "§ 61.31(g).",
    "category": "Complex / HP / Tailwheel / Solo",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of § 61.31(g) in a {{make_model}} pressurized aircraft. I have determined that {{he_or_she}} is proficient in the operation and systems of a pressurized aircraft.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_model",
      "he_or_she"
    ]
  },
  {
    "code": "A.71",
    "title": "A.71 To act as pilot in command in a tailwheel airplane",
    "regulationRefs": "§ 61.31(i).",
    "category": "Complex / HP / Tailwheel / Solo",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training of § 61.31(i) in a {{make_model}} of tailwheel airplane. I have determined that {{he_or_she}} is proficient in the operation of a tailwheel airplane.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_model",
      "he_or_she"
    ]
  },
  {
    "code": "A.72",
    "title": "A.72 To act as pilot in command of an aircraft in solo operations when the pilot does not hold an appropriate category/class rating",
    "regulationRefs": "§ 61.31(d)(2).",
    "category": "Complex / HP / Tailwheel / Solo",
    "body": "I certify that {{student_name}} has received the training as required by § 61.31(d)(2) to serve as a pilot in command in a {{category_class}} of aircraft. I have determined that {{he_or_she}} is prepared to solo that {{make_model}} aircraft. Limitations: {{limitations}}.",
    "placeholders": [
      "student_name",
      "category_class",
      "he_or_she",
      "make_model",
      "limitations"
    ]
  },
  {
    "code": "A.73",
    "title": "A.73 Retesting after failure of a knowledge or practical test",
    "regulationRefs": "§ 61.49.",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}} has received the additional {{training_type}} training as required by § 61.49. I have determined that {{he_or_she}} is proficient to pass the {{test_name}} knowledge/practical test.",
    "placeholders": [
      "student_name",
      "training_type",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.74",
    "title": "A.74 Additional aircraft category or class rating (other than ATP)",
    "regulationRefs": "§ 61.63(b) or (c).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training for an additional {{aircraft_category_class_rating}}. I have determined that {{he_or_she}} is prepared for the {{test_name}} practical test for the addition of a {{test_name}} {{rating_name}} type rating.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "aircraft_category_class_rating",
      "he_or_she",
      "test_name",
      "rating_name"
    ]
  },
  {
    "code": "A.75",
    "title": "A.75 Type rating only, already holds the appropriate category or class rating (other than ATP)",
    "regulationRefs": "§ 61.63(d)(2).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}} has received the required training of § 61.63(d)(2) for an addition of a {{test_name}} type rating.",
    "placeholders": [
      "student_name",
      "test_name"
    ]
  },
  {
    "code": "A.76",
    "title": "A.76 Type rating concurrently with an additional category or class rating (other than ATP)",
    "regulationRefs": "§ 61.63(d)(2).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}} has received the required training of § 61.63(d)(2) for an addition of a {{test_name}} {{specific_category_class_type}} type rating. I have determined that {{he_or_she}} is prepared for the {{test_name}} practical test for the addition of a {{test_name}} {{rating_name}} type rating.",
    "placeholders": [
      "student_name",
      "test_name",
      "specific_category_class_type",
      "he_or_she",
      "rating_name"
    ]
  },
  {
    "code": "A.77",
    "title": "A.77 Type rating only, already holds the appropriate category or class rating (at the ATP level)",
    "regulationRefs": "§ 61.157(b)(2).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}} has received the required training of § 61.157(b)(2) for an addition of a {{test_name}} type rating.",
    "placeholders": [
      "student_name",
      "test_name"
    ]
  },
  {
    "code": "A.78",
    "title": "A.78 Type rating concurrently with an additional category or class rating (at the ATP level)",
    "regulationRefs": "§ 61.157(b)(2).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}} has received the required training of § 61.157(b)(2) for an addition of a {{rating_name}} type rating.",
    "placeholders": [
      "student_name",
      "rating_name"
    ]
  },
  {
    "code": "A.79",
    "title": "A.79 Launch procedures for operating a glider",
    "regulationRefs": "§ 61.31(j).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required training in a glider {{make_model}} for {{launch_procedure}} procedure. I have determined that {{he_or_she}} is proficient in {{ground_tow_aerotow_self_launch}} procedure.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "make_model",
      "launch_procedure",
      "he_or_she",
      "ground_tow_aerotow_self_launch"
    ]
  },
  {
    "code": "A.80",
    "title": "A.80 Glider and unpowered ultralight vehicle towing experience",
    "regulationRefs": "§ 61.69(a)(5).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has accomplished at least three flights in an aircraft while towing {{tow_activity}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "tow_activity"
    ]
  },
  {
    "code": "A.81",
    "title": "A.81 Glider and unpowered ultralight vehicle towing ground and flight",
    "regulationRefs": "§ 61.69(a)(3).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the required ground and flight training in {{tow_vehicle}}. I have determined that {{he_or_she}} is proficient in the techniques and procedures essential to the safe towing of {{tow_vehicle_plural}} including airspeed limitations; emergency procedures; signals used; and maximum angles of bank. Appendix A A-21",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "tow_vehicle",
      "he_or_she",
      "tow_vehicle_plural"
    ]
  },
  {
    "code": "A.82",
    "title": "A.82 Review of a home study curriculum",
    "regulationRefs": "§ 61.35(a)(1).",
    "category": "Additional Ratings",
    "body": "I certify I have reviewed the home study curriculum of {{student_name}}. I have determined that {{he_or_she}} is prepared for the {{test_name}} knowledge test.",
    "placeholders": [
      "student_name",
      "he_or_she",
      "test_name"
    ]
  },
  {
    "code": "A.83",
    "title": "A.83 Experimental aircraft only—additional aircraft category or class rating (other than ATP)",
    "regulationRefs": "§ 61.63(h).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, as required by § 61.63(h), is proficient to act as pilot in command in a {{experimental_aircraft}} of experimental aircraft and has logged at least 5 hours flight time logged between September 1, 2004, and August 31, 2005, while acting as pilot in command in {{experimental_aircraft}} that has been issued an experimental certificate.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "experimental_aircraft"
    ]
  },
  {
    "code": "A.84",
    "title": "A.84 Experimental aircraft only—additional aircraft category or class rating ATP",
    "regulationRefs": "§ 61.65(g).",
    "category": "Additional Ratings",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, as required by § 61.65(g) is proficient to act as pilot in command in a {{experimental_aircraft}} of experimental aircraft and has logged at least 5 hours flight time logged between September 1, 2004, and August 31, 2005, while acting as pilot in command in {{experimental_aircraft}} that has been issued an experimental certificate.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "experimental_aircraft"
    ]
  },
  {
    "code": "A.85",
    "title": "A.85 Aeronautical experience credit—ultralight vehicles",
    "regulationRefs": "§ 61.52.",
    "category": "Additional Ratings",
    "body": "I certify that I have reviewed the records of {{student_name}}, as required by § 61.52(c). I have determined that {{he_or_she}} may use {{hours}} aeronautical experience obtained in an ultralight vehicle to meet the requirements for {{privilege}}. NIGHT VISION GOGGLES (NVG) OPERATIONS",
    "placeholders": [
      "student_name",
      "he_or_she",
      "hours",
      "privilege"
    ]
  },
  {
    "code": "A.86",
    "title": "A.86 Endorsement required for ground training to act as pilot in command of an aircraft using NVG",
    "regulationRefs": "§ 61.31(k)(1). This training and endorsement must be given by an authorized instructor, which is one who meets the requirements of § 61.195(k)(1) through (7). Refer to § 61.31(k)(3) for exceptions to this required ground training.",
    "category": "NVG",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the ground training required by § 61.31(k)(1), (i) through (v) to conduct night vision goggle operations. Appendix A A-22",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number"
    ]
  },
  {
    "code": "A.87",
    "title": "A.87 Endorsement required for flight training and statement of proficiency to act as pilot in command of an aircraft using NVG",
    "regulationRefs": "§ 61.31(k)(2). This training and endorsement must be given by an authorized instructor, which is one who meets the requirements of § 61.195(k)(1) through (7). Refer to § 61.31(k)(3) for exceptions to this required",
    "category": "NVG",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the flight training on night vision goggle operations required by 14 CFR § 61.31(k)(2), (i) through (iv). I find {{he_or_she}} proficient in the use of night vision goggles.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "he_or_she"
    ]
  },
  {
    "code": "A.88",
    "title": "A.88 Endorsement required to provide training for NVG operations",
    "regulationRefs": "§ 61.195(k)(7).",
    "category": "NVG",
    "body": "I certify that {{student_name}}, holder of CFI Certificate No. {{cfi_certificate_number}}, meets the night vision goggle instructor requirements of § 61.195(k) and is authorized to perform the night vision goggle pilot-in-command qualification and recent flight experience requirements under §§ 61.31(k) and 61.57(f) and (g). This endorsement does not provide the authority to endorse another flight instructor as a night vision goggle instructor.",
    "placeholders": [
      "student_name",
      "cfi_certificate_number"
    ]
  },
  {
    "code": "A.89",
    "title": "A.89 Endorsement for EFVS ground training",
    "regulationRefs": "§ 61.66(a).",
    "category": "EFVS",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the ground training required by § 61.66(a) appropriate to the {{aircraft_category}} category of aircraft.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "aircraft_category"
    ]
  },
  {
    "code": "A.90",
    "title": "A.90 Endorsement for EFVS flight training",
    "regulationRefs": "§ 61.66(b).",
    "category": "EFVS",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has received the flight training required by § 61.66(b) and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "aircraft_category",
      "efvs_operation"
    ]
  },
  {
    "code": "A.91",
    "title": "A.91 Endorsement for EFVS ground and flight training",
    "regulationRefs": "§ 61.66(a) and (b).",
    "category": "EFVS",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the ground training required by § 61.66(a) and has received the flight training required by § 61.66(b) for EFVS operations and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}.",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "aircraft_category",
      "efvs_operation"
    ]
  },
  {
    "code": "A.92",
    "title": "A.92 Endorsement for EFVS supplementary training",
    "regulationRefs": "§ 61.66(c).",
    "category": "EFVS",
    "body": "I certify that {{student_name}}, {{certificate_grade}}, {{certificate_number}}, has satisfactorily completed the required ground and flight training required by § 61.66(c) for EFVS operations and is proficient in the use of EFVS in the {{aircraft_category}} category of aircraft for EFVS operations conducted under {{efvs_operation}}. Appendix B B-1",
    "placeholders": [
      "student_name",
      "certificate_grade",
      "certificate_number",
      "aircraft_category",
      "efvs_operation"
    ]
  }
]

export const ENDORSEMENT_CATEGORIES: EndorsementCategory[] = [
  ...new Set(ENDORSEMENT_CATALOG.map((e) => e.category)),
] as EndorsementCategory[]

const PLACEHOLDER_RE = /\{\{([a-z0-9_]+)\}\}/g

export function getEndorsementTemplate(code: string): EndorsementTemplate | undefined {
  return ENDORSEMENT_CATALOG.find((e) => e.code === code)
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
