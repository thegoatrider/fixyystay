// Comprehensive dataset of Indian States, Cities, and Pincode Auto-detection

export interface LocationLookupResult {
  success: boolean
  pincode: string
  city?: string
  district?: string
  state?: string
  areas?: string[]
  error?: string
}

export const INDIAN_STATES_AND_CITIES: Record<string, string[]> = {
  "Maharashtra": [
    "Alibag", "Mumbai", "Navi Mumbai", "Thane", "Pune", "Lonavala", "Khandala",
    "Mahabaleshwar", "Panchgani", "Matheran", "Karjat", "Kolad", "Raigad", "Kihim",
    "Nagaon", "Mandwa", "Kashid", "Murud", "Diveagar", "Shrivardhan", "Harihareshwar",
    "Nashik", "Igatpuri", "Trimbakeshwar", "Shirdi", "Nagpur", "Aurangabad (Chhatrapati Sambhaji Nagar)",
    "Kolhapur", "Ratnagiri", "Ganpatipule", "Guhagar", " Dapoli", "Sindhudurg", "Malvan",
    "Tarkarli", "Vengurla", "Sawantwadi", "Palghar", "Dahanu", "Vasai-Virar", "Kalyan-Dombivli",
    "Solapur", "Pandharpur", "Satara", "Wai", "Karad", "Sangli", "Miraj", "Ahmednagar",
    "Bhandardara", "Amravati", "Chikhaldara", "Akola", "Jalgaon", "Bhusawal", "Dhule",
    "Nandurbar", "Nanded", "Latur", "Osmanabad (Dharashiv)", "Beed", "Parbhani", "Jalna",
    "Hingoli", "Buldhana", "Yavatmal", "Washim", "Wardha", "Chandrapur", "Tadoba",
    "Bhandara", "Gondia", "Gadchiroli"
  ],
  "Goa": [
    "North Goa", "South Goa", "Panaji", "Calangute", "Candolim", "Baga", "Anjuna",
    "Vagator", "Morjim", "Ashwem", "Arambol", "Mandrem", "Assagao", "Siolim",
    "Porvorim", "Mapusa", "Aldona", "Old Goa", "Dona Paula", "Miramar", "Bambolim",
    "Margao", "Colva", "Benaulim", "Varca", "Cavelossim", "Mobor", "Betalbatim",
    "Majorda", "Utorda", "Palolem", "Agonda", "Patnem", "Canacona", "Cabo de Rama",
    "Vasco da Gama", "Bogmalo", "Ponda", "Bicholim", "Pernem", "Quepem", "Sanguem"
  ],
  "Karnataka": [
    "Bengaluru (Bangalore)", "Mysuru (Mysore)", "Coorg (Madikeri)", "Chikmagalur",
    "Gokarna", "Hampi (Hospet)", "Mangaluru (Mangalore)", "Udupi", "Manipal", "Murudeshwar",
    "Karwar", "Dandeli", "Sakleshpur", "Kabini", "Bandipur", "Nagarhole", "Hassan",
    "Belur", "Halebidu", "Shimoga (Shivamogga)", "Jog Falls", "Agumbe", "Hubballi-Dharwad",
    "Belagavi (Belgaum)", "Kalaburagi (Gulbarga)", "Ballari (Bellary)", "Vijayapura (Bijapur)",
    "Badami", "Aihole", "Pattadakal", "Davangere", "Tumakuru (Tumkur)", "Kolar",
    "Chikkaballapur", "Nandi Hills", "Ramanagara", "Mandya", "Srirangapatna", "Chamarajanagar",
    "BR Hills", "Chitradurga", "Raichur", "Bidar", "Koppal", "Gadag", "Haveri",
    "Bagalkot", "Yadgir", "Kushalnagar", "Virajpet", "Mudigere"
  ],
  "Himachal Pradesh": [
    "Manali", "Shimla", "Dharamshala", "McLeodGanj", "Kasol", "Kullu", "Kasauli",
    "Spiti Valley (Kaza)", "Jibhi", "Tirthan Valley", "Shoja", "Bir Billing", "Dalhousie",
    "Khajjiar", "Chamba", "Palampur", "Kangra", "Manikaran", "Tosh", "Malana",
    "Naggar", "Solang Valley", "Sethi", "Mashobra", "Kufri", "Narkanda", "Chail",
    "Solan", "Barog", "Parwanoo", "Kinnaur (Reckong Peo)", "Kalpa", "Sangla", "Chitkul",
    "Keylong (Lahaul)", "Sissu", "Mandi", "Barot", "Prashar Lake", "Bilaspur",
    "Hamirpur", "Una", "Sirmaur (Nahan)", "Renuka Ji", "Rampur Bushahr"
  ],
  "Uttarakhand": [
    "Rishikesh", "Dehradun", "Mussoorie", "Nainital", "Haridwar", "Jim Corbett (Ramnagar)",
    "Lansdowne", "Auli", "Joshimath", "Bhimtal", "Sattal", "Naukuchiatal", "Mukteshwar",
    "Ramgarh", "Pangot", "Almora", "Ranikhet", "Kausani", "Binsar", "Jageshwar",
    "Kanatal", "Dhanaulti", "Chamba (Tehri)", "Tehri Lake", "Chopta", "Tungnath",
    "Kedarnath", "Badrinath", "Gangotri", "Yamunotri", "Uttarkashi", "Harsil",
    "Chakrata", "Landour", "Haldwani", "Kathgodam", "Rudrapur", "Kashipur", "Roorkee",
    "Kotdwar", "Pauri Garhwal", "Srinagar (Garhwal)", "Rudraprayag", "Chamoli",
    "Valley of Flowers", "Pithoragarh", "Munsiyari", "Chaukori", "Bageshwar", "Champawat", "Abbott Mount"
  ],
  "Rajasthan": [
    "Jaipur", "Udaipur", "Jodhpur", "Jaisalmer", "Pushkar", "Mount Abu",
    "Sawai Madhopur (Ranthambore)", "Bikaner", "Ajmer", "Alwar", "Sariska", "Neemrana",
    "Kumbhalgarh", "Ranakpur", "Nathdwara", "Rajsamand", "Chittorgarh", "Bundi",
    "Kota", "Jhalawar", "Baran", "Bharatpur", "Deeg", "Dholpur", "Karauli",
    "Mandawa", "Jhunjhunu", "Sikar", "Khatu Shyamji", "Churu", "Salasar",
    "Nagaur", "Khimsar", "Pali", "Jawai", "Sirohi", "Jalore", "Barmer", "Pokhran",
    "Bhilwara", "Tonk", "Dausa", "Abhaneri", "Banswara", "Dungarpur", "Pratapgarh",
    "Sri Ganganagar", "Hanumangarh", "Kishangarh"
  ],
  "Kerala": [
    "Munnar", "Kochi (Cochin)", "Fort Kochi", "Wayanad", "Kalpetta", "Sulthan Bathery",
    "Alleppey (Alappuzha)", "Kumarakom", "Varkala", "Thiruvananthapuram (Trivandrum)",
    "Kovalam", "Poovar", "Thekkady (Periyar)", "Vagamon", "Idukki", "Kozhikode (Calicut)",
    "Thrissur", "Athirappilly", "Guruvayur", "Kannur", "Bekal", "Kasaragod",
    "Kollam (Quilon)", "Ashtamudi", "Munroe Island", "Kottayam", "Pala", "Palakkad",
    "Silent Valley", "Nelliyampathy", "Malappuram", "Nilambur", "Pathanamthitta",
    "Gavi", "Sabarimala", "Cherai Beach", "Marari Beach", "Ponmudi"
  ],
  "Tamil Nadu": [
    "Chennai", "Ooty (Udhagamandalam)", "Coonoor", "Kotagiri", "Kodaikanal",
    "Mahabalipuram (Mamallapuram)", "Kovalam (ECR)", "Coimbatore", "Pollachi", "Valparai",
    "Madurai", "Rameswaram", "Dhanushkodi", "Kanyakumari", "Yercaud", "Salem",
    "Yelagiri", "Kanchipuram", "Tiruchirappalli (Trichy)", "Thanjavur (Tanjore)",
    "Kumbakonam", "Velankanni", "Nagapattinam", "Karaikudi (Chettinad)", "Sivaganga",
    "Tirunelveli", "Courtallam (Kutralam)", "Thoothukudi (Tuticorin)", "Vellore",
    "Tiruvannamalai", "Gingee", "Chidambaram", "Cuddalore", "Villupuram",
    "Dindigul", "Theni", "Megamalai", "Erode", "Tiruppur", "Karur", "Namakkal",
    "Kolli Hills", "Dharmapuri", "Hogenakkal", "Krishnagiri", "Hosur", "Pudukkottai",
    "Ramanathapuram", "Virudhunagar", "Tenkasi", "Ariyalur", "Perambalur", "Tiruvarur",
    "Mayiladuthurai", "Ranipet", "Tirupattur", "Kallakurichi", "Chengalpattu"
  ],
  "Delhi / NCR": [
    "New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi",
    "West Delhi", "Dwarka", "Aerocity", "Hauz Khas", "Chhatarpur", "Connaught Place",
    "Gurugram (Gurgaon)", "Manesar", "Sohna", "Faridabad", "Noida", "Greater Noida",
    "Ghaziabad", "Indirapuram", "Bahadurgarh", "Sonipat"
  ],
  "Gujarat": [
    "Ahmedabad", "Gandhinagar", "Surat", "Vadodara (Baroda)", "Statue of Unity (Kevadia)",
    "Rajkot", "Kutch (Bhuj)", "Rann of Kutch (Dhordo)", "Mandvi", "Gandhidham",
    "Gir National Park (Sasan Gir)", "Junagadh", "Somnath (Veraval)", "Dwarka", "Porbandar",
    "Shivrajpur Beach", "Saputara (Dang)", "Daman", "Diu", "Silvassa", "Jamnagar",
    "Bhavnagar", "Palitana", "Velavadar", "Anand", "Nadiad", "Bharuch", "Ankleshwar",
    "Navsari", "Valsad", "Vapi", "Udvada", "Mehsana", "Patan", "Modhera",
    "Banaskantha (Palanpur)", "Ambaji", "Sabarkantha (Himmatnagar)", "Polo Forest",
    "Surendranagar", "Little Rann of Kutch", "Morbi", "Amreli", "Botad", "Dahod",
    "Godhra (Panchmahal)", "Champaner-Pavagadh", "Chhota Udepur", "Tapi (Vyara)", "Aravalli"
  ],
  "West Bengal": [
    "Kolkata", "Darjeeling", "Kalimpong", "Kurseong", "Mirik", "Siliguri",
    "Digha", "Mandarmani", "Tajpur", "Shankarpur", "Bakkhali", "Sundarbans",
    "Shantiniketan (Bolpur)", "Dooars", "Lataguri", "Gorumara", "Jaldapara",
    "Alipurduar", "Cooch Behar", "Jalpaiguri", "Lava", "Lolegaon", "Rishop",
    "Sandakphu", "Howrah", "Hooghly (Chinsurah)", "Bandel", "Serampore",
    "Burdwan (Bardhaman)", "Durgapur", "Asansol", "Bankura", "Bishnupur",
    "Mukutmanipur", "Purulia", "Ajodhya Hills", "Medinipur (Midnapore)", "Kharagpur",
    "Haldia", "Nadia (Krishnanagar)", "Mayapur", "Murshidabad", "Berhampore",
    "Malda", "Raiganj", "Balurghat", "Birbhum", "Tarapith"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Varanasi (Kashi)", "Agra", "Mathura", "Vrindavan", "Govardhan",
    "Ayodhya", "Prayagraj (Allahabad)", "Noida", "Greater Noida", "Ghaziabad",
    "Kanpur", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Saharanpur",
    "Gorakhpur", "Jhansi", "Chitrakoot", "Sarnath", "Kushinagar", "Shravasti",
    "Dudhwa National Park (Lakhimpur Kheri)", "Pilibhit", "Bijnor", "Muzaffarnagar",
    "Shamli", "Baghpat", "Hapur", "Bulandshahr", "Rampur", "Amroha", "Sambhal",
    "Budaun", "Shahjahanpur", "Farrukhabad", "Kannauj", "Etawah", "Mainpuri",
    "Firozabad", "Hathras", "Etah", "Kasganj", "Jalaun (Orai)", "Lalitpur",
    "Mahoba", "Hamirpur (UP)", "Banda", "Fatehpur", "Pratapgarh (UP)", "Kaushambi",
    "Mirzapur", "Vindhyachal", "Sonbhadra", "Bhadohi", "Jaunpur", "Ghazipur",
    "Chandauli", "Ballia", "Mau", "Azamgarh", "Ambedkar Nagar", "Sultanpur",
    "Amethi", "Raebareli", "Unnao", "Hardoi", "Sitapur", "Barabanki", "Gonda",
    "Bahraich", "Balrampur", "Siddharthnagar", "Basti", "Sant Kabir Nagar",
    "Maharajganj", "Deoria"
  ],
  "Madhya Pradesh": [
    "Bhopal", "Indore", "Ujjain", "Gwalior", "Jabalpur", "Bhedaghat", "Khajuraho",
    "Pachmarhi", "Bandhavgarh", "Kanha (Mandla)", "Pench (Seoni)", "Satpura (Madhai)",
    "Panna", "Orchha", "Mandu (Mandavgad)", "Maheshwar", "Omkareshwar", "Sanchi",
    "Bhimbetka", "Chanderi", "Shivpuri", "Datia", "Morena", "Bhind", "Sheopur (Kuno)",
    "Guna", "Ashoknagar", "Sagar", "Damoh", "Chhatarpur", "Tikamgarh", "Niwari",
    "Rewa", "Satna", "Maihar", "Sidhi", "Singrauli", "Shahdol", "Umaria",
    "Anuppur (Amarkantak)", "Katni", "Dindori", "Narsinghpur", "Chhindwara", "Tamia",
    "Balaghat", "Betul", "Hoshangabad (Narmadapuram)", "Harda", "Vidisha", "Raisen",
    "Sehore", "Rajgarh", "Dewas", "Shajapur", "Agar Malwa", "Ratlam", "Mandsaur",
    "Gandhisagar", "Neemuch", "Dhar", "Jhabua", "Alirajpur", "Barwani", "Khargone",
    "Khandwa", "Hanuwantiya", "Burhanpur"
  ],
  "Telangana": [
    "Hyderabad", "Secunderabad", "Ramoji Film City", "Ananthagiri Hills (Vikarabad)",
    "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Bhadrachalam", "Nalgonda",
    "Nagarjuna Sagar", "Mahbubnagar", "Adilabad", "Kuntala", "Mancherial", "Nirmal",
    "Basar", "Sangareddy", "Medak", "Siddipet", "Kamareddy", "Jagtial", "Peddapalli",
    "Ramagundam", "Jayashankar Bhupalpally", "Mulugu (Bogatha)", "Bhadradri Kothagudem",
    "Suryapet", "Yadadri Bhuvanagiri", "Rangareddy", "Medchal-Malkajgiri", "Wanaparthy",
    "Nagarkurnool (Srisailam Highway)", "Jogulamba Gadwal", "Narayanpet"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam (Vizag)", "Araku Valley", "Lambasingi", "Vijayawada", "Tirupati",
    "Srikalahasti", "Horsley Hills", "Guntur", "Amaravati", "Nellore", "Rajahmundry",
    "Papikondalu", "Kakinada", "Konaseema (Amalapuram)", "Dindi", "Kurnool",
    "Srisailam", "Mantralayam", "Anantapur", "Lepakshi", "Puttaparthi", "Kadapa (YSR)",
    "Gandikota", "Belum Caves", "Chittoor", "Kuppam", "Prakasam (Ongole)", "Chirala",
    "Suryalanka", "Machilipatnam", "Eluru", "Bhimavaram", "Tadepalligudem",
    "Vizianagaram", "Srikakulam", "Nandyal", "Ahobilam", "Bapatla", "Palnadu"
  ],
  "Punjab": [
    "Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali (SAS Nagar)",
    "Zirakpur", "Hoshiarpur", "Pathankot", "Gurdaspur", "Kapurthala", "Phagwara",
    "Anandpur Sahib", "Rupnagar (Ropar)", "Moga", "Firozpur", "Fazilka", "Abohar",
    "Faridkot", "Sri Muktsar Sahib", "Mansa", "Barnala", "Sangrur", "Malerkotla",
    "Fatehgarh Sahib", "Sirhind", "Shaheed Bhagat Singh Nagar (Nawanshahr)", "Tarn Taran"
  ],
  "Haryana": [
    "Gurugram (Gurgaon)", "Faridabad", "Panchkula", "Morni Hills", "Ambala", "Karnal",
    "Kurukshetra", "Panipat", "Sonipat", "Murthal", "Rohtak", "Hisar", "Pinjore",
    "Yamunanagar", "Kalesar", "Bhiwani", "Charkhi Dadri", "Sirsa", "Fatehabad",
    "Jind", "Kaithal", "Mahendragarh (Narnaul)", "Rewari", "Jhajjar", "Bahadurgarh",
    "Palwal", "Nuh (Mewat)", "Sohna", "Manesar"
  ],
  "Chandigarh": [
    "Chandigarh", "Sector 17 Chandigarh", "Sukhna Lake Area"
  ],
  "Jammu & Kashmir": [
    "Srinagar", "Dal Lake", "Gulmarg", "Pahalgam", "Sonamarg", "Yusmarg", "Doodhpathri",
    "Gurez Valley", "Anantnag", "Kokernag", "Verinag", "Daksum", "Pulwama", "Shopian",
    "Kulgam", "Aharbal", "Budgam", "Baramulla", "Uri", "Kupwara", "Bangus Valley",
    "Bandipora", "Ganderbal", "Jammu", "Katra (Vaishno Devi)", "Patnitop", "Sanasar",
    "Nathatop", "Bhaderwah", "Udhampur", "Reasi", "Shiv Khori", "Samba", "Kathua",
    "Basohli", "Ramban", "Banihal", "Doda", "Kishtwar", "Sinthan Top", "Rajouri", "Poonch"
  ],
  "Ladakh": [
    "Leh", "Nubra Valley (Diskit / Hunder)", "Turtuk", "Pangong Tso", "Tso Moriri",
    "Hanle", "Kargil", "Zanskar (Padum)", "Drass", "Lamayuru", "Alchi", "Chumathang"
  ],
  "Odisha": [
    "Bhubaneswar", "Puri", "Konark", "Cuttack", "Chilika Lake (Barkul / Rambha)",
    "Satapada", "Gopalpur-on-Sea", "Berhampur (Brahmapur)", "Daringbadi", "Similipal (Baripada)",
    "Chandipur", "Balasore", "Bhadrak", "Bhitarkanika", "Kendrapara", "Paradip",
    "Jagatsinghpur", "Jajpur", "Dhenkanal", "Angul", "Satkosia", "Sambalpur", "Hirakud",
    "Rourkela", "Sundargarh", "Jharsuguda", "Bargarh", "Balangir", "Kalahandi (Bhawanipatna)",
    "Koraput", "Deomali", "Jeypore", "Rayagada", "Malkangiri", "Nabarangpur",
    "Kandhamal (Phulbani)", "Nayagarh", "Khordha", "Ganjam", "Keonjhar", "Mayurbhanj"
  ],
  "Bihar": [
    "Patna", "Bodh Gaya", "Gaya", "Rajgir", "Nalanda", "Vaishali", "Pawapuri",
    "Muzaffarpur", "Bhagalpur", "Vikramshila", "Darbhanga", "Madhubani", "Purnia",
    "Begusarai", "Munger", "Sasaram (Rohtas)", "Valmiki Nagar (West Champaran)", "Bettiah",
    "Motihari (East Champaran)", "Sitamarhi", "Chapra (Saran)", "Siwan", "Gopalganj",
    "Hajipur", "Samastipur", "Saharsa", "Madhepura", "Supaul", "Katihar", "Kishanganj",
    "Araria", "Lakhisarai", "Jamui", "Khagaria", "Banka", "Ara (Bhojpur)", "Buxar",
    "Bhabua (Kaimur)", "Aurangabad (Bihar)", "Jehanabad", "Arwal", "Nawada", "Sheikhpura"
  ],
  "Jharkhand": [
    "Ranchi", "Netarhat", "McCluskieganj", "Patratu Valley", "Jamshedpur", "Dalma Hills",
    "Deoghar", "Dhanbad", "Bokaro", "Hazaribagh", "Betla National Park (Palamu)",
    "Daltonganj", "Giridih", "Parasnath (Shikharji)", "Dumka", "Massanjore", "Ramgarh",
    "Rajrappa", "Chaibasa", "Saranda", "Ghatshila", "Koderma", "Tilaiya", "Chatra",
    "Garhwa", "Latehar", "Lohardaga", "Gumla", "Simdega", "Khunti", "Saraikela",
    "Jamtara", "Godda", "Sahibganj", "Pakur"
  ],
  "Chhattisgarh": [
    "Raipur", "Naya Raipur", "Jagdalpur (Bastar)", "Chitrakote Falls", "Kanker",
    "Bilaspur", "Achanakmar", "Mainpat", "Ambikapur (Surguja)", "Bhilai-Durg",
    "Sirpur", "Rajim", "Dongargarh", "Rajnandgaon", "Kawardha (Bhoramdeo)", "Chilpi",
    "Korba", "Raigarh", "Janjgir-Champa", "Dhamtari", "Gangrel Dam", "Mahasamund",
    "Barnawapara", "Dantewada", "Kondagaon", "Narayanpur", "Bijapur (CG)", "Sukma",
    "Jashpur", "Koriya", "Surajpur", "Balrampur (CG)", "Balod", "Bemetara", "Mungeli"
  ],
  "Assam": [
    "Guwahati", "Kaziranga", "Majuli", "Jorhat", "Tezpur", "Nameri", "Dibrugarh",
    "Tinsukia", "Digboi", "Sivasagar", "Manas National Park", "Haflong (Dima Hasao)",
    "Silchar", "Karimganj", "Diphu (Karbi Anglong)", "Goalpara", "Bongaigaon",
    "Kokrajhar", "Dhubri", "Barpeta", "Nalbari", "Nagaon (Assam)", "Hojai",
    "Sonitpur", "Lakhimpur (North Lakhimpur)", "Dhemaji", "Golaghat", "Charaideo"
  ],
  "Meghalaya": [
    "Shillong", "Cherrapunji (Sohra)", "Mawsynram", "Dawki (Shnongpdeng)",
    "Mawlynnong", "Laitlum", "Umiam Lake", "Jowai (Jaintia Hills)", "Krang Suri",
    "Nongstoin", "Mawphanlur", "Tura (Garo Hills)", "Nokrek", "Williamnagar", "Baghmara"
  ],
  "Sikkim": [
    "Gangtok", "Pelling", "Lachung", "Lachen", "Yumthang Valley", "Gurudongmar",
    "Tsomgo Lake", "Nathula", "Zuluk", "Ravangla", "Namchi", "Yuksom", "Rinchenpong",
    "Kaluk", "Aritar", "Mangan", "Gyalshing", "Pakyong"
  ],
  "Arunachal Pradesh": [
    "Tawang", "Bomdila", "Dirang", "Ziro Valley", "Itanagar", "Naharlagun",
    "Bhalukpong", "Pasighat", "Roing (Mayudia)", "Mechuka", "Anini", "Namsai",
    "Tezu", "Parshuram Kund", "Aalo (Along)", "Daporijo", "Changlang", "Namdapha", "Khonsa"
  ],
  "Nagaland": [
    "Kohima", "Dzukou Valley", "Khonoma", "Dimapur", "Mokokchung", "Mon (Longwa)",
    "Wokha (Doyang)", "Phek", "Zunheboto", "Tuensang", "Kiphire", "Peren"
  ],
  "Manipur": [
    "Imphal", "Loktak Lake (Moirang)", "Ukhrul (Shirui)", "Moreh", "Churachandpur",
    "Bishnupur (Manipur)", "Thoubal", "Senapati", "Tamenglong", "Chandel"
  ],
  "Mizoram": [
    "Aizawl", "Reiek", "Champhai", "Lunglei", "Thenzawl", "Serchhip", "Vantawng",
    "Kolasib", "Lawngtlai", "Saiha", "Mamit", "Hmuifang"
  ],
  "Tripura": [
    "Agartala", "Udaipur (Neermahal / Melaghar)", "Unakoti (Kailashahar)", "Jampui Hills",
    "Dharmanagar", "Ambassa", "Belonia", "Khowai", "Chabimura"
  ],
  "Puducherry": [
    "Pondicherry (Puducherry)", "White Town", "Auroville", "Serenity Beach",
    "Paradise Beach", "Karaikal", "Mahe", "Yanam"
  ],
  "Andaman & Nicobar Islands": [
    "Port Blair (Sri Vijaya Puram)", "Havelock Island (Swaraj Dweep)",
    "Neil Island (Shaheed Dweep)", "Baratang", "Rangat", "Mayabunder",
    "Diglipur (Ross & Smith)", "Little Andaman", "Long Island", "Wandoor", "Chidiya Tapu"
  ],
  "Lakshadweep": [
    "Agatti Island", "Bangaram Island", "Kavaratti", "Kadmat Island", "Minicoy", "Kalpeni"
  ],
  "Dadra & Nagar Haveli and Daman & Diu": [
    "Daman", "Devka Beach", "Jampore Beach", "Diu", "Nagoa Beach", "Ghoghla Beach",
    "Silvassa", "Dudhni Lake", "Khanvel"
  ]
}

// Flat list of unique popular Indian cities for quick search / auto-suggest
export const ALL_POPULAR_CITIES: string[] = Array.from(
  new Set(Object.values(INDIAN_STATES_AND_CITIES).flat().map(c => c.trim()))
).sort((a, b) => a.localeCompare(b))

// City UID prefixes for property codes
export const CITY_PREFIXES: Record<string, string> = {
  'Alibag': 'ALB',
  'Raigad': 'ALB',
  'Lonavala': 'LON',
  'Khandala': 'KHA',
  'Matheran': 'MAT',
  'Mahabaleshwar': 'MAH',
  'Mahableshwar': 'MAH',
  'Panchgani': 'PAN',
  'Karjat': 'KRJ',
  'Kolad': 'KOL',
  'Mumbai': 'MUM',
  'Navi Mumbai': 'NVM',
  'Thane': 'THA',
  'Pune': 'PUN',
  'Nashik': 'NSK',
  'Igatpuri': 'IGT',
  'Nagpur': 'NAG',
  'Aurangabad': 'IXU',
  'Kolhapur': 'KLH',
  'Ratnagiri': 'RTG',
  'Sindhudurg': 'SDD',
  'Malvan': 'MLV',
  'Goa': 'GOA',
  'North Goa': 'NGO',
  'South Goa': 'SGO',
  'Panaji': 'PNJ',
  'Calangute': 'CAL',
  'Candolim': 'CND',
  'Anjuna': 'ANJ',
  'Assagao': 'ASG',
  'Margao': 'MAO',
  'Palolem': 'PAL',
  'Bengaluru (Bangalore)': 'BLR',
  'Bengaluru': 'BLR',
  'Bangalore': 'BLR',
  'Mysuru (Mysore)': 'MYS',
  'Mysuru': 'MYS',
  'Mysore': 'MYS',
  'Coorg (Madikeri)': 'CRG',
  'Coorg': 'CRG',
  'Madikeri': 'CRG',
  'Chikmagalur': 'CKM',
  'Gokarna': 'GOK',
  'Hampi': 'HMP',
  'Mangaluru': 'IXE',
  'Udupi': 'UDP',
  'Manali': 'MAN',
  'Shimla': 'SHI',
  'Dharamshala': 'DHR',
  'McLeodGanj': 'MCL',
  'Kasol': 'KSL',
  'Kullu': 'KLU',
  'Kasauli': 'KSA',
  'Dalhousie': 'DLH',
  'Spiti Valley': 'SPT',
  'Rishikesh': 'RSH',
  'Dehradun': 'DDN',
  'Mussoorie': 'MUS',
  'Nainital': 'NTL',
  'Haridwar': 'HRD',
  'Jim Corbett': 'CRB',
  'Mukteshwar': 'MKT',
  'Bhimtal': 'BMT',
  'Jaipur': 'JAI',
  'Udaipur': 'UDA',
  'Jodhpur': 'JDH',
  'Jaisalmer': 'JSL',
  'Pushkar': 'PSK',
  'Mount Abu': 'MAB',
  'Ranthambore': 'RAN',
  'Bikaner': 'BKB',
  'Ajmer': 'AJM',
  'Munnar': 'MUN',
  'Kochi (Cochin)': 'KOC',
  'Kochi': 'KOC',
  'Wayanad': 'WYD',
  'Alleppey (Alappuzha)': 'ALP',
  'Alleppey': 'ALP',
  'Kumarakom': 'KMK',
  'Varkala': 'VRK',
  'Thekkady': 'TKD',
  'Thiruvananthapuram': 'TRV',
  'Kovalam': 'KVL',
  'Kozhikode': 'CCJ',
  'Chennai': 'CHE',
  'Ooty (Udhagamandalam)': 'OOT',
  'Ooty': 'OOT',
  'Kodaikanal': 'KOD',
  'Mahabalipuram': 'MBL',
  'Coimbatore': 'CJB',
  'Madurai': 'IXM',
  'Rameswaram': 'RMD',
  'Kanyakumari': 'KNK',
  'Yercaud': 'YCD',
  'New Delhi': 'DEL',
  'Delhi': 'DEL',
  'Gurugram (Gurgaon)': 'GGN',
  'Gurugram': 'GGN',
  'Noida': 'NOI',
  'Greater Noida': 'GNO',
  'Faridabad': 'FBD',
  'Ghaziabad': 'GZB',
  'Ahmedabad': 'AMD',
  'Surat': 'SUR',
  'Vadodara': 'BDQ',
  'Rajkot': 'RAJ',
  'Kutch': 'BHJ',
  'Dwarka': 'DWK',
  'Somnath': 'SMN',
  'Daman': 'DMN',
  'Diu': 'DIU',
  'Kolkata': 'CCU',
  'Darjeeling': 'DAR',
  'Kalimpong': 'KLP',
  'Siliguri': 'SLG',
  'Digha': 'DGH',
  'Mandarmani': 'MDM',
  'Lucknow': 'LKO',
  'Varanasi': 'VNS',
  'Agra': 'AGR',
  'Mathura': 'MTR',
  'Vrindavan': 'VRN',
  'Ayodhya': 'AYJ',
  'Prayagraj': 'IXD',
  'Kanpur': 'KNU',
  'Chandigarh': 'CHD',
  'Amritsar': 'ASR',
  'Ludhiana': 'LUH',
  'Jalandhar': 'JUC',
  'Panchkula': 'PKL',
  'Bhopal': 'BHO',
  'Indore': 'IDR',
  'Ujjain': 'UJJ',
  'Gwalior': 'GWL',
  'Jabalpur': 'JLR',
  'Khajuraho': 'HJR',
  'Pachmarhi': 'PCH',
  'Srinagar': 'SXR',
  'Gulmarg': 'GLM',
  'Pahalgam': 'PHG',
  'Jammu': 'IXJ',
  'Katra': 'KTR',
  'Leh': 'IXL',
  'Ladakh': 'IXL',
  'Hyderabad': 'HYD',
  'Warangal': 'WGC',
  'Visakhapatnam': 'VTZ',
  'Vijayawada': 'VGA',
  'Tirupati': 'TIR',
  'Araku Valley': 'ARK',
  'Bhubaneswar': 'BBI',
  'Puri': 'PUR',
  'Konark': 'KNK',
  'Patna': 'PAT',
  'Bodh Gaya': 'GAY',
  'Ranchi': 'IXR',
  'Jamshedpur': 'IXW',
  'Deoghar': 'DGH',
  'Raipur': 'RPR',
  'Jagdalpur': 'JGB',
  'Guwahati': 'GAU',
  'Kaziranga': 'KZR',
  'Shillong': 'SHL',
  'Cherrapunji': 'CHR',
  'Gangtok': 'GKT',
  'Pelling': 'PLG',
  'Tawang': 'TWG',
  'Kohima': 'KHM',
  'Imphal': 'IMF',
  'Aizawl': 'AJL',
  'Agartala': 'IXA',
  'Pondicherry': 'PDY',
  'Puducherry': 'PDY',
  'Port Blair': 'IXZ',
  'Havelock Island': 'HVL'
}

export function getCityCode(city: string): string {
  if (!city) return 'PRP'
  if (CITY_PREFIXES[city]) return CITY_PREFIXES[city]

  for (const [key, val] of Object.entries(CITY_PREFIXES)) {
    if (city.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(city.toLowerCase())) {
      return val
    }
  }

  const alpha = city.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return (alpha.slice(0, 3) || 'PRP').padEnd(3, 'X')
}

// High-precision 6-digit exact pincode overrides for key hospitality & travel hubs
const EXACT_PINCODE_MAP: Record<string, { city: string; state: string; areas: string[] }> = {
  // Alibag & Raigad Coast
  '402201': { city: 'Alibag', state: 'Maharashtra', areas: ['Alibag', 'Varsoli', 'Kihim', 'Chendhare', 'Thal', 'Veshvi', 'Kurul', 'bagmala'] },
  '402202': { city: 'Alibag', state: 'Maharashtra', areas: ['Revdanda', 'Chaul', 'Korlai', 'Salav', 'Theronda'] },
  '402203': { city: 'Alibag', state: 'Maharashtra', areas: ['Poynad', 'Peje', 'Shahapur', 'Kamarle'] },
  '402204': { city: 'Alibag', state: 'Maharashtra', areas: ['Nagaon', 'Akshi', 'Balanagar', 'Hatale'] },
  '402208': { city: 'Alibag', state: 'Maharashtra', areas: ['Awas', 'Sasawane', 'Mandwa', 'Zirad', 'Chondi', 'Kihim'] },
  '402209': { city: 'Alibag', state: 'Maharashtra', areas: ['Chondi', 'Kihim', 'Mapgaon', 'Dhokawade'] },
  '402401': { city: 'Murud', state: 'Maharashtra', areas: ['Murud Janjira', 'Kashid', 'Nandgaon', 'Agardanda', 'Rajpuri'] },
  '402110': { city: 'Diveagar', state: 'Maharashtra', areas: ['Diveagar', 'Shrivardhan', 'Borli Panchatan'] },
  '402114': { city: 'Shrivardhan', state: 'Maharashtra', areas: ['Shrivardhan', 'Harihareshwar', 'Bagmandla'] },
  '402304': { city: 'Kolad', state: 'Maharashtra', areas: ['Kolad', 'Roha', 'Sutarwadi', 'Kundalika'] },
  '410101': { city: 'Matheran', state: 'Maharashtra', areas: ['Matheran Hill Station', 'Neral', 'Dasturi Naka'] },
  '410201': { city: 'Karjat', state: 'Maharashtra', areas: ['Karjat', 'Kashele', 'Bhivpuri', 'Chowk', 'ND Studio Area'] },
  // Lonavala & Mahabaleshwar
  '410401': { city: 'Lonavala', state: 'Maharashtra', areas: ['Lonavala', 'Tungarli', 'Bhangarwadi', 'Valvan', 'Nangargaon', 'Karla'] },
  '410402': { city: 'Lonavala', state: 'Maharashtra', areas: ['INS Shivaji Lonavala', 'Tiger Point', 'Bhushi Dam'] },
  '410403': { city: 'Khandala', state: 'Maharashtra', areas: ['Khandala', 'Kune Village', 'Old Mumbai Pune Highway'] },
  '410405': { city: 'Lonavala', state: 'Maharashtra', areas: ['Karla', 'Malavli', 'Pawna Lake', 'Bhaja'] },
  '412805': { city: 'Panchgani', state: 'Maharashtra', areas: ['Panchgani', 'Bhilar', 'Khingar', 'Dandeghar', 'Table Land'] },
  '412806': { city: 'Mahabaleshwar', state: 'Maharashtra', areas: ['Mahabaleshwar', 'Metgutad', 'Old Mahabaleshwar', 'Tapola', 'Lingmala'] },
  '422403': { city: 'Igatpuri', state: 'Maharashtra', areas: ['Igatpuri', 'Ghoti', 'Bhandardara Road', 'Kasara Ghat'] },
  '422212': { city: 'Nashik', state: 'Maharashtra', areas: ['Trimbakeshwar', 'Anjaneri', 'Gangapur Road', 'Sula Vineyards Area'] },
  '423109': { city: 'Shirdi', state: 'Maharashtra', areas: ['Shirdi Temple Area', 'Pimpalwadi Road', 'Nighoj'] },
  // Goa
  '403001': { city: 'Panaji', state: 'Goa', areas: ['Panaji', 'Fontainhas', 'Miramar', 'Altinho'] },
  '403002': { city: 'Panaji', state: 'Goa', areas: ['Ribandar', 'Old Goa', 'Chimbel'] },
  '403004': { city: 'Panaji', state: 'Goa', areas: ['Dona Paula', 'Caranzalem', 'Taleigao', 'Bambolim'] },
  '403507': { city: 'Mapusa', state: 'Goa', areas: ['Mapusa', 'Assagao', 'Anjuna', 'Parra', 'Canca'] },
  '403509': { city: 'Anjuna', state: 'Goa', areas: ['Anjuna', 'Vagator', 'Chapora', 'Assagao', 'Ozran'] },
  '403512': { city: 'Morjim', state: 'Goa', areas: ['Morjim', 'Ashwem', 'Mandrem', 'Agarwada'] },
  '403515': { city: 'Candolim', state: 'Goa', areas: ['Candolim', 'Sinquerim', 'Nerul', 'Reis Magos', 'Pilerne'] },
  '403516': { city: 'Calangute', state: 'Goa', areas: ['Calangute', 'Baga', 'Arpora', 'Saligao', 'Naika Vaddo'] },
  '403517': { city: 'Siolim', state: 'Goa', areas: ['Siolim', 'Oxel', 'Chapora Riverfront', 'Marna'] },
  '403521': { city: 'Porvorim', state: 'Goa', areas: ['Porvorim', 'Socorro', 'Salvador do Mundo', 'Penha de Franca'] },
  '403524': { city: 'Arambol', state: 'Goa', areas: ['Arambol', 'Keri (Querim)', 'Paliem', 'Tiracol'] },
  '403527': { city: 'Mandrem', state: 'Goa', areas: ['Mandrem', 'Ashwem Beach', 'Junasa Vaddo'] },
  '403601': { city: 'Margao', state: 'Goa', areas: ['Margao', 'Fatorda', 'Borda', 'Aquem'] },
  '403702': { city: 'Canacona', state: 'Goa', areas: ['Palolem', 'Agonda', 'Patnem', 'Canacona', 'Chaudi', 'Galgibaga'] },
  '403708': { city: 'Colva', state: 'Goa', areas: ['Colva', 'Sernabatim', 'Betalbatim', 'Gandaulim'] },
  '403713': { city: 'Majorda', state: 'Goa', areas: ['Majorda', 'Utorda', 'Betalbatim', 'Calata'] },
  '403716': { city: 'Benaulim', state: 'Goa', areas: ['Benaulim', 'Vasvaddo', 'pedda'] },
  '403721': { city: 'Varca', state: 'Goa', areas: ['Varca', 'Fatrade', 'Orlim'] },
  '403731': { city: 'Cavelossim', state: 'Goa', areas: ['Cavelossim', 'Mobor', 'Carmona', 'Assolna'] },
  // Himachal & Uttarakhand
  '175131': { city: 'Manali', state: 'Himachal Pradesh', areas: ['Manali', 'Old Manali', 'Aleo', 'Prini', 'Vashisht', 'Solang Valley', 'Simsa'] },
  '175105': { city: 'Kasol', state: 'Himachal Pradesh', areas: ['Kasol', 'Manikaran', 'Chalal', 'Tosh', 'Kalga', 'Pulga'] },
  '175123': { city: 'Jibhi', state: 'Himachal Pradesh', areas: ['Jibhi', 'Banjar', 'Tirthan Valley', 'Gushaini', 'Shoja'] },
  '176219': { city: 'Dharamshala', state: 'Himachal Pradesh', areas: ['McLeodGanj', 'Bhagsunag', 'Dharamkot', 'Naddi'] },
  '176077': { city: 'Bir Billing', state: 'Himachal Pradesh', areas: ['Bir', 'Billing', 'Chogan', 'Suja'] },
  '171001': { city: 'Shimla', state: 'Himachal Pradesh', areas: ['The Mall Shimla', 'Lakkar Bazar', 'Jakhoo', 'Chotta Shimla'] },
  '171007': { city: 'Shimla', state: 'Himachal Pradesh', areas: ['Mashobra', 'Craignano', 'Naldehra'] },
  '171012': { city: 'Shimla', state: 'Himachal Pradesh', areas: ['Kufri', 'Fagu', 'Chharabra'] },
  '173204': { city: 'Kasauli', state: 'Himachal Pradesh', areas: ['Kasauli', 'Garkhal', 'Mashobra Kasauli', 'Kimughat'] },
  '249192': { city: 'Rishikesh', state: 'Uttarakhand', areas: ['Tapovan', 'Laxman Jhula', 'Shivpuri', 'Jonk', 'Neelkanth Road'] },
  '249201': { city: 'Rishikesh', state: 'Uttarakhand', areas: ['Rishikesh', 'Ram Jhula', 'Muni Ki Reti', 'Swarg Ashram'] },
  '248179': { city: 'Mussoorie', state: 'Uttarakhand', areas: ['Mussoorie', 'Mall Road', 'Landour', 'Kulri', 'Camel Back Road', 'Kempty'] },
  '263001': { city: 'Nainital', state: 'Uttarakhand', areas: ['Mallital', 'Tallital', 'Ayarpatta', 'Pangot', 'Snow View'] },
  '263136': { city: 'Bhimtal', state: 'Uttarakhand', areas: ['Bhimtal', 'Sattal', 'Naukuchiatal', 'Bhowali'] },
  '263138': { city: 'Mukteshwar', state: 'Uttarakhand', areas: ['Mukteshwar', 'Sitla', 'Sargakhet', 'Dhari'] },
  '244715': { city: 'Jim Corbett (Ramnagar)', state: 'Uttarakhand', areas: ['Ramnagar', 'Dhikuli', 'Garjiya', 'Bijrani', 'Dhela', 'Marchula'] },
  // Karnataka, Kerala & Tamil Nadu
  '571201': { city: 'Coorg (Madikeri)', state: 'Karnataka', areas: ['Madikeri', 'Mekeri', 'Galibeedu', 'Murnad', 'Boesragi'] },
  '571234': { city: 'Coorg (Madikeri)', state: 'Karnataka', areas: ['Kushalnagar', 'Bylakuppe', 'Dubare', 'Suntikoppa'] },
  '577101': { city: 'Chikmagalur', state: 'Karnataka', areas: ['Chikmagalur', 'Mullayanagiri Road', 'Joldal', 'Aldur', 'Vastare'] },
  '581326': { city: 'Gokarna', state: 'Karnataka', areas: ['Gokarna', 'Kudle Beach', 'Om Beach', 'Belehittal', 'Tadri'] },
  '583239': { city: 'Hampi (Hospet)', state: 'Karnataka', areas: ['Hampi', 'Kamalapur', 'Kaddirampura', 'Sanapur'] },
  '643001': { city: 'Ooty (Udhagamandalam)', state: 'Tamil Nadu', areas: ['Ooty', 'Charing Cross', 'Fernhill', 'Fingerpost', 'Elk Hill'] },
  '643101': { city: 'Coonoor', state: 'Tamil Nadu', areas: ['Coonoor', 'Sims Park', 'Bedford', 'Wellington'] },
  '624101': { city: 'Kodaikanal', state: 'Tamil Nadu', areas: ['Kodaikanal', 'Lake Road', 'Vattakanal', 'Pambarpuram', 'Naidupuram', 'Vilpatti'] },
  '603104': { city: 'Mahabalipuram (Mamallapuram)', state: 'Tamil Nadu', areas: ['Mamallapuram', 'ECR', 'Devaneri', 'Poonjeri'] },
  '636601': { city: 'Yercaud', state: 'Tamil Nadu', areas: ['Yercaud', 'Lake Area', 'Pagoda Point', 'Nagalsur'] },
  '685612': { city: 'Munnar', state: 'Kerala', areas: ['Munnar', 'Chithirapuram', 'Pallivasal', 'Anachal', 'Devikulam'] },
  '685565': { city: 'Munnar', state: 'Kerala', areas: ['Chinnakanal', 'Suryanelli', 'Anayirankal'] },
  '685509': { city: 'Thekkady (Periyar)', state: 'Kerala', areas: ['Thekkady', 'Kumily', 'Spring Valley', 'Murikkady'] },
  '686563': { city: 'Kumarakom', state: 'Kerala', areas: ['Kumarakom', 'Kavanattinkara', 'Cheepunkal', 'Vembanad Lakefront'] },
  '695141': { city: 'Varkala', state: 'Kerala', areas: ['Varkala', 'North Cliff', 'South Cliff', 'Papanasam', 'Odayam'] },
  '695527': { city: 'Kovalam', state: 'Kerala', areas: ['Kovalam', 'Vizhinjam', 'Light House Beach', 'Samudra Beach'] },
  '682001': { city: 'Kochi (Cochin)', state: 'Kerala', areas: ['Fort Kochi', 'Mattancherry', 'Princess Street'] },
  '673121': { city: 'Wayanad', state: 'Kerala', areas: ['Kalpetta', 'Meppadi', 'Vythiri', 'Muttil'] }
}

/**
 * Exhaustive 3-digit Indian Postal Sorting District Database (110 to 855).
 * Every single valid 6-digit Indian PIN code starts with one of these 3-digit sorting district prefixes.
 */
const PIN_PREFIX_MAP: Record<string, { city: string; state: string; sampleAreas: string[] }> = {
  // ── ZONE 1: DELHI (11), HARYANA (12-13), PUNJAB (14-15), CHANDIGARH (16), HIMACHAL PRADESH (17), J&K & LADAKH (18-19) ──
  '110': { city: 'New Delhi', state: 'Delhi / NCR', sampleAreas: ['Connaught Place', 'South Delhi', 'Hauz Khas', 'Saket', 'Vasant Kunj', 'Dwarka', 'Karol Bagh', 'Aerocity', 'Chhatarpur'] },
  '121': { city: 'Faridabad', state: 'Haryana', sampleAreas: ['Faridabad', 'Surajkund', 'Palwal', 'Ballabgarh', 'Hodal'] },
  '122': { city: 'Gurugram (Gurgaon)', state: 'Haryana', sampleAreas: ['DLF Phase 1-5', 'Golf Course Road', 'Sohna Road', 'Cyber Hub', 'Manesar', 'Sohna', 'Nuh'] },
  '123': { city: 'Rewari', state: 'Haryana', sampleAreas: ['Rewari', 'Dharuhera', 'Bawal', 'Narnaul', 'Mahendragarh'] },
  '124': { city: 'Rohtak', state: 'Haryana', sampleAreas: ['Rohtak', 'Jhajjar', 'Bahadurgarh', 'Sampla', 'Beri'] },
  '125': { city: 'Hisar', state: 'Haryana', sampleAreas: ['Hisar', 'Sirsa', 'Fatehabad', 'Hansi', 'Tohana'] },
  '126': { city: 'Jind', state: 'Haryana', sampleAreas: ['Jind', 'Narwana', 'Safidon', 'Julana'] },
  '127': { city: 'Bhiwani', state: 'Haryana', sampleAreas: ['Bhiwani', 'Charkhi Dadri', 'Loharu', 'Tosham'] },
  '131': { city: 'Sonipat', state: 'Haryana', sampleAreas: ['Sonipat', 'Murthal', 'Kundli', 'Ganaur', 'Gohana'] },
  '132': { city: 'Karnal', state: 'Haryana', sampleAreas: ['Karnal', 'Panipat', 'Samalkha', 'Gharaunda', 'Assandh'] },
  '133': { city: 'Ambala', state: 'Haryana', sampleAreas: ['Ambala Cantt', 'Ambala City', 'Panchkula', 'Pinjore', 'Morni Hills', 'Kalka'] },
  '134': { city: 'Panchkula', state: 'Haryana', sampleAreas: ['Panchkula', 'Morni Hills', 'Pinjore', 'Barwala', 'Naraingarh'] },
  '135': { city: 'Yamunanagar', state: 'Haryana', sampleAreas: ['Yamunanagar', 'Jagadhri', 'Chhachhrauli', 'Kalesar'] },
  '136': { city: 'Kurukshetra', state: 'Haryana', sampleAreas: ['Kurukshetra', 'Thanesar', 'Pehowa', 'Kaithal', 'Shahbad'] },
  '140': { city: 'Mohali (SAS Nagar)', state: 'Punjab', sampleAreas: ['Mohali', 'Zirakpur', 'Kharar', 'Derabassi', 'Ropar', 'Anandpur Sahib', 'Morinda'] },
  '141': { city: 'Ludhiana', state: 'Punjab', sampleAreas: ['Ludhiana', 'Sarabha Nagar', 'Civil Lines', 'Jagraon', 'Khanna', 'Samrala'] },
  '142': { city: 'Moga', state: 'Punjab', sampleAreas: ['Moga', 'Bagha Purana', 'Dharamkot', 'Nihal Singh Wala'] },
  '143': { city: 'Amritsar', state: 'Punjab', sampleAreas: ['Amritsar', 'Golden Temple Area', 'Ranjit Avenue', 'Tarn Taran', 'Batala', 'Gurdaspur'] },
  '144': { city: 'Jalandhar', state: 'Punjab', sampleAreas: ['Jalandhar', 'Model Town', 'Phagwara', 'Kapurthala', 'Nawanshahr', 'Nakodar'] },
  '145': { city: 'Pathankot', state: 'Punjab', sampleAreas: ['Pathankot', 'Sujanpur', 'Dhar Kalan', 'jugial'] },
  '146': { city: 'Hoshiarpur', state: 'Punjab', sampleAreas: ['Hoshiarpur', 'Garhshankar', 'Dasuya', 'Mukerian', 'Talwara'] },
  '147': { city: 'Patiala', state: 'Punjab', sampleAreas: ['Patiala', 'Rajpura', 'Nabha', 'Samana', 'Fatehgarh Sahib', 'Sirhind'] },
  '148': { city: 'Sangrur', state: 'Punjab', sampleAreas: ['Sangrur', 'Barnala', 'Malerkotla', 'Sunam', 'Dhuri'] },
  '151': { city: 'Bathinda', state: 'Punjab', sampleAreas: ['Bathinda', 'Faridkot', 'Kotkapura', 'Mansa', 'Rampura Phul'] },
  '152': { city: 'Firozpur', state: 'Punjab', sampleAreas: ['Firozpur', 'Fazilka', 'Abohar', 'Sri Muktsar Sahib', 'Malout'] },
  '160': { city: 'Chandigarh', state: 'Chandigarh', sampleAreas: ['Sector 17', 'Sector 35', 'Sector 8', 'Sector 9', 'Manimajra', 'Mohali Phase 1-11'] },
  '171': { city: 'Shimla', state: 'Himachal Pradesh', sampleAreas: ['Shimla Mall Road', 'Mashobra', 'Kufri', 'Narkanda', 'Chotta Shimla', 'Naldehra', 'Theog', 'Rohru'] },
  '172': { city: 'Kinnaur (Reckong Peo)', state: 'Himachal Pradesh', sampleAreas: ['Rampur Bushahr', 'Reckong Peo', 'Kalpa', 'Sangla', 'Chitkul', 'Nako', 'Spiti (Kaza)', 'Sarahan'] },
  '173': { city: 'Kasauli', state: 'Himachal Pradesh', sampleAreas: ['Kasauli', 'Solan', 'Chail', 'Barog', 'Dharampur', 'Parwanoo', 'Nahan', 'Paonta Sahib'] },
  '174': { city: 'Bilaspur', state: 'Himachal Pradesh', sampleAreas: ['Bilaspur', 'Una', 'Chintpurni', 'Ghumarwin', 'Naina Devi', 'Nalagarh', 'Baddi'] },
  '175': { city: 'Manali', state: 'Himachal Pradesh', sampleAreas: ['Manali', 'Old Manali', 'Kullu', 'Kasol', 'Manikaran', 'Jibhi', 'Tirthan Valley', 'Mandi', 'Barot', 'Keylong', 'Sissu'] },
  '176': { city: 'Dharamshala', state: 'Himachal Pradesh', sampleAreas: ['Dharamshala', 'McLeodGanj', 'Palampur', 'Bir Billing', 'Kangra', 'Dalhousie', 'Khajjiar', 'Chamba'] },
  '177': { city: 'Hamirpur', state: 'Himachal Pradesh', sampleAreas: ['Hamirpur', 'Nadaun', 'Sujanpur Tira', 'Bhoranj', 'Jawalamukhi'] },
  '180': { city: 'Jammu', state: 'Jammu & Kashmir', sampleAreas: ['Jammu City', 'Gandhi Nagar', 'Trikuta Nagar', 'Bahu Plaza', 'Channi Himmat'] },
  '181': { city: 'Jammu', state: 'Jammu & Kashmir', sampleAreas: ['Akhnoor', 'RS Pura', 'Bishnah', 'Nagrota', 'Bari Brahmana'] },
  '182': { city: 'Katra (Vaishno Devi)', state: 'Jammu & Kashmir', sampleAreas: ['Katra', 'Patnitop', 'Udhampur', 'Reasi', 'Ramban', 'Banihal', 'Doda', 'Bhaderwah', 'Kishtwar'] },
  '184': { city: 'Kathua', state: 'Jammu & Kashmir', sampleAreas: ['Kathua', 'Samba', 'Basohli', 'Hiranagar', 'Billawar'] },
  '185': { city: 'Rajouri', state: 'Jammu & Kashmir', sampleAreas: ['Rajouri', 'Poonch', 'Nowshera', 'Sunderbani', 'Mendhar'] },
  '190': { city: 'Srinagar', state: 'Jammu & Kashmir', sampleAreas: ['Dal Lake', 'Boulevard Road', 'Rajbagh', 'Lal Chowk', 'Nigeen Lake', 'Hazratbal'] },
  '191': { city: 'Sonamarg', state: 'Jammu & Kashmir', sampleAreas: ['Sonamarg', 'Ganderbal', 'Budgam', 'Yusmarg', 'Doodhpathri', 'Pampore'] },
  '192': { city: 'Pahalgam', state: 'Jammu & Kashmir', sampleAreas: ['Pahalgam', 'Anantnag', 'Kokernag', 'Verinag', 'Pulwama', 'Shopian', 'Kulgam'] },
  '193': { city: 'Gulmarg', state: 'Jammu & Kashmir', sampleAreas: ['Gulmarg', 'Tangmarg', 'Baramulla', 'Sopore', 'Kupwara', 'Bandipora', 'Gurez'] },
  '194': { city: 'Leh', state: 'Ladakh', sampleAreas: ['Leh', 'Changspa', 'Nubra Valley', 'Diskit', 'Hunder', 'Pangong', 'Kargil', 'Zanskar'] },

  // ── ZONE 2: UTTAR PRADESH (20-23, 25-28) & UTTARAKHAND (24, 26) ──
  '201': { city: 'Noida', state: 'Uttar Pradesh', sampleAreas: ['Noida Sector 18', 'Noida Sector 62', 'Greater Noida', 'Ghaziabad', 'Indirapuram', 'Vaishali', 'Modinagar', 'Hapur'] },
  '202': { city: 'Aligarh', state: 'Uttar Pradesh', sampleAreas: ['Aligarh', 'Civil Lines', 'Khurja', 'Atrauli'] },
  '203': { city: 'Bulandshahr', state: 'Uttar Pradesh', sampleAreas: ['Bulandshahr', 'Sikandrabad', 'Anupshahr', 'Garhmukteshwar'] },
  '204': { city: 'Hathras', state: 'Uttar Pradesh', sampleAreas: ['Hathras', 'Sadabad', 'Sikandra Rao'] },
  '205': { city: 'Mainpuri', state: 'Uttar Pradesh', sampleAreas: ['Mainpuri', 'Shikohabad', 'Sirsaganj', 'Bhogaon'] },
  '206': { city: 'Etawah', state: 'Uttar Pradesh', sampleAreas: ['Etawah', 'Auraiya', 'Dibiyapur', 'Bharthana'] },
  '207': { city: 'Etah', state: 'Uttar Pradesh', sampleAreas: ['Etah', 'Kasganj', 'Soron', 'Jalesar'] },
  '208': { city: 'Kanpur', state: 'Uttar Pradesh', sampleAreas: ['Kanpur', 'Swaroop Nagar', 'Civil Lines', 'Mall Road', 'Kalyanpur'] },
  '209': { city: 'Kanpur', state: 'Uttar Pradesh', sampleAreas: ['Unnao', 'Kannauj', 'Farrukhabad', 'Fatehgarh', 'Bithoor'] },
  '210': { city: 'Banda', state: 'Uttar Pradesh', sampleAreas: ['Chitrakoot', 'Banda', 'Mahoba', 'Hamirpur', 'Karwi'] },
  '211': { city: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh', sampleAreas: ['Civil Lines', 'Sangam', 'George Town', 'Naini', 'Jhusi'] },
  '212': { city: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh', sampleAreas: ['Fatehpur', 'Kaushambi', 'Phulpur', 'Handia'] },
  '221': { city: 'Varanasi (Kashi)', state: 'Uttar Pradesh', sampleAreas: ['Assi Ghat', 'Dashashwamedh Ghat', 'Godowlia', 'Cantonment', 'Sarnath', 'Sigra', 'Lanka', 'Bhadohi'] },
  '222': { city: 'Jaunpur', state: 'Uttar Pradesh', sampleAreas: ['Jaunpur', 'Shahganj', 'Machhlishahr', 'Mariahu'] },
  '223': { city: 'Azamgarh', state: 'Uttar Pradesh', sampleAreas: ['Azamgarh', 'Phulpur', 'Mubarakpur'] },
  '224': { city: 'Ayodhya', state: 'Uttar Pradesh', sampleAreas: ['Ayodhya Dham', 'Ram Janmabhoomi Area', 'Faizabad', 'Naya Ghat', 'Ambedkar Nagar'] },
  '225': { city: 'Barabanki', state: 'Uttar Pradesh', sampleAreas: ['Barabanki', 'Deva Sharif', 'Ramnagar'] },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh', sampleAreas: ['Hazratganj', 'Gomti Nagar', 'Alambagh', 'Indira Nagar', 'Mahanagar', 'Aminabad', 'vibhuti Khand'] },
  '227': { city: 'Amethi', state: 'Uttar Pradesh', sampleAreas: ['Amethi', 'Gauriganj', 'Jagdishpur', 'Musafirkhana'] },
  '228': { city: 'Sultanpur', state: 'Uttar Pradesh', sampleAreas: ['Sultanpur', 'Kadipur', 'Lambhua'] },
  '229': { city: 'Raebareli', state: 'Uttar Pradesh', sampleAreas: ['Raebareli', 'Lalganj', 'Salon', 'Unchahar'] },
  '230': { city: 'Pratapgarh (UP)', state: 'Uttar Pradesh', sampleAreas: ['Pratapgarh', 'Kunda', 'Patti', 'Lalganj'] },
  '231': { city: 'Mirzapur', state: 'Uttar Pradesh', sampleAreas: ['Mirzapur', 'Vindhyachal', 'Chunar', 'Sonbhadra', 'Robertsganj', 'Renukoot'] },
  '232': { city: 'Chandauli', state: 'Uttar Pradesh', sampleAreas: ['Mughalsarai (Pt. Deen Dayal Upadhyaya Nagar)', 'Chandauli', 'Chakia'] },
  '233': { city: 'Ghazipur', state: 'Uttar Pradesh', sampleAreas: ['Ghazipur', 'Zamania', 'Saidpur'] },
  '241': { city: 'Hardoi', state: 'Uttar Pradesh', sampleAreas: ['Hardoi', 'Sandila', 'Shahabad', 'Bilgram'] },
  '242': { city: 'Shahjahanpur', state: 'Uttar Pradesh', sampleAreas: ['Shahjahanpur', 'Tilhar', 'Powayan'] },
  '243': { city: 'Bareilly', state: 'Uttar Pradesh', sampleAreas: ['Bareilly', 'Civil Lines', 'Rajendra Nagar', 'Budaun', 'Aonla'] },
  '244': { city: 'Moradabad', state: 'Uttar Pradesh', sampleAreas: ['Moradabad', 'Jim Corbett (Ramnagar)', 'Kashipur', 'Rampur', 'Amroha', 'Sambhal'] },
  '245': { city: 'Hapur', state: 'Uttar Pradesh', sampleAreas: ['Hapur', 'Pilkhuwa', 'Garhmukteshwar'] },
  '246': { city: 'Lansdowne', state: 'Uttarakhand', sampleAreas: ['Lansdowne', 'Kotdwar', 'Pauri Garhwal', 'Srinagar Garhwal', 'Rudraprayag', 'Chamoli', 'Joshimath', 'Auli', 'Badrinath', 'Kedarnath', 'Chopta', 'Bijnor'] },
  '247': { city: 'Saharanpur', state: 'Uttar Pradesh', sampleAreas: ['Saharanpur', 'Roorkee', 'Deoband', 'Muzaffarnagar', 'Shamli'] },
  '248': { city: 'Dehradun', state: 'Uttarakhand', sampleAreas: ['Rajpur Road', 'Mussoorie', 'Landour', 'Chakrata', 'Clement Town', 'Sahastradhara', 'Vikasnagar', 'Doiwala'] },
  '249': { city: 'Rishikesh', state: 'Uttarakhand', sampleAreas: ['Tapovan', 'Laxman Jhula', 'Ram Jhula', 'Haridwar', 'Shivpuri', 'Kanatal', 'Dhanaulti', 'Tehri', 'Uttarkashi', 'Harsil', 'Gangotri'] },
  '250': { city: 'Meerut', state: 'Uttar Pradesh', sampleAreas: ['Meerut', 'Cantt', 'Modipuram', 'Baghpat', 'Baraut', 'Sardhana'] },
  '251': { city: 'Muzaffarnagar', state: 'Uttar Pradesh', sampleAreas: ['Muzaffarnagar', 'Khatauli', 'Budhana'] },
  '261': { city: 'Sitapur', state: 'Uttar Pradesh', sampleAreas: ['Sitapur', 'Naimisharanya', 'Biswan', 'Misrikh'] },
  '262': { city: 'Pilibhit', state: 'Uttar Pradesh', sampleAreas: ['Pilibhit', 'Dudhwa National Park', 'Lakhimpur Kheri', 'Gola Gokarannath', 'Palai Kalan'] },
  '263': { city: 'Nainital', state: 'Uttarakhand', sampleAreas: ['Nainital', 'Bhimtal', 'Mukteshwar', 'Sattal', 'Naukuchiatal', 'Almora', 'Ranikhet', 'Kausani', 'Binsar', 'Haldwani', 'Rudrapur', 'Pithoragarh', 'Munsiyari'] },
  '271': { city: 'Gonda', state: 'Uttar Pradesh', sampleAreas: ['Gonda', 'Bahraich', 'Shravasti', 'Balrampur', 'Tulsipur'] },
  '272': { city: 'Basti', state: 'Uttar Pradesh', sampleAreas: ['Basti', 'Siddharthnagar', 'Sant Kabir Nagar', 'Khalilabad'] },
  '273': { city: 'Gorakhpur', state: 'Uttar Pradesh', sampleAreas: ['Gorakhpur', 'Gorakhnath Area', 'Golghar', 'Maharajganj', 'Sonauli'] },
  '274': { city: 'Kushinagar', state: 'Uttar Pradesh', sampleAreas: ['Kushinagar', 'Padrauna', 'Deoria', 'Salempur'] },
  '275': { city: 'Mau', state: 'Uttar Pradesh', sampleAreas: ['Mau', 'Ghosi', 'Muhammadabad'] },
  '276': { city: 'Azamgarh', state: 'Uttar Pradesh', sampleAreas: ['Azamgarh', 'Lalganj', 'Sagri'] },
  '277': { city: 'Ballia', state: 'Uttar Pradesh', sampleAreas: ['Ballia', 'Rasra', 'Bairia', 'Sikanderpur'] },
  '281': { city: 'Mathura', state: 'Uttar Pradesh', sampleAreas: ['Mathura', 'Vrindavan', 'Govardhan', 'Barsana', 'Gokul', 'Chhata'] },
  '282': { city: 'Agra', state: 'Uttar Pradesh', sampleAreas: ['Tajganj', 'Fatehabad Road', 'Sadar Bazar', 'Dayalbagh', 'Sikandra'] },
  '283': { city: 'Agra', state: 'Uttar Pradesh', sampleAreas: ['Fatehpur Sikri', 'Firozabad', 'Tundla', 'Etmadpur', 'Bah'] },
  '284': { city: 'Jhansi', state: 'Uttar Pradesh', sampleAreas: ['Jhansi', 'Lalitpur', 'Deogarh', 'Mauranipur', 'Babina'] },
  '285': { city: 'Jalaun (Orai)', state: 'Uttar Pradesh', sampleAreas: ['Orai', 'Jalaun', 'Kalpi', 'Konch'] },

  // ── ZONE 3: RAJASTHAN (30-34) & GUJARAT / DAMAN & DIU / D&NH (36-39) ──
  '301': { city: 'Alwar', state: 'Rajasthan', sampleAreas: ['Alwar', 'Sariska', 'Neemrana', 'Bhiwadi', 'Siliserh', 'Behror', 'Tijara'] },
  '302': { city: 'Jaipur', state: 'Rajasthan', sampleAreas: ['C-Scheme', 'MI Road', 'Amer', 'Vaishali Nagar', 'Malviya Nagar', 'Bani Park', 'Mansarovar', 'Raja Park', 'Kukas'] },
  '303': { city: 'Jaipur', state: 'Rajasthan', sampleAreas: ['Kukas (Amer)', 'Chomu', 'Dausa', 'Abhaneri', 'Mehandipur Balaji', 'Kotputli', 'Sanganer'] },
  '304': { city: 'Tonk', state: 'Rajasthan', sampleAreas: ['Tonk', 'Banasthali', 'Newai', 'Malpura', 'Deoli'] },
  '305': { city: 'Pushkar', state: 'Rajasthan', sampleAreas: ['Pushkar', 'Ajmer', 'Kishangarh', 'Beawar', 'Dargah Bazar', 'Ana Sagar'] },
  '306': { city: 'Pali', state: 'Rajasthan', sampleAreas: ['Pali', 'Jawai', 'Bera', 'Ranakpur', 'Sadri', 'Sojat', 'Falna', 'Ghanerao'] },
  '307': { city: 'Mount Abu', state: 'Rajasthan', sampleAreas: ['Mount Abu', 'Nakki Lake', 'Abu Road', 'Sirohi', 'Jalore'] },
  '311': { city: 'Bhilwara', state: 'Rajasthan', sampleAreas: ['Bhilwara', 'Shahpura', 'Mandalgarh', 'Bijolia'] },
  '312': { city: 'Chittorgarh', state: 'Rajasthan', sampleAreas: ['Chittorgarh', 'Fort Area', 'Bassi', 'Pratapgarh', 'Nimbahera'] },
  '313': { city: 'Udaipur', state: 'Rajasthan', sampleAreas: ['Lake Pichola', 'Fateh Sagar', 'City Palace Area', 'Kumbhalgarh', 'Nathdwara', 'Rajsamand', 'Hiran Magri', 'Badi Lake', 'Sajjangarh'] },
  '314': { city: 'Dungarpur', state: 'Rajasthan', sampleAreas: ['Dungarpur', 'Sagwara', 'Bichhiwara'] },
  '321': { city: 'Bharatpur', state: 'Rajasthan', sampleAreas: ['Bharatpur', 'Keoladeo National Park', 'Deeg', 'Kaman'] },
  '322': { city: 'Sawai Madhopur (Ranthambore)', state: 'Rajasthan', sampleAreas: ['Ranthambore Road', 'Sawai Madhopur', 'Karauli', 'Hindaun'] },
  '323': { city: 'Bundi', state: 'Rajasthan', sampleAreas: ['Bundi', 'Taragarh Area', 'Rawatbhata', 'Keshoraipatan'] },
  '324': { city: 'Kota', state: 'Rajasthan', sampleAreas: ['Kota', 'Talwandi', 'Gumanpura', 'Chambal Garden'] },
  '325': { city: 'Baran', state: 'Rajasthan', sampleAreas: ['Baran', 'Shahbad', 'Anta', 'Mangrol'] },
  '326': { city: 'Jhalawar', state: 'Rajasthan', sampleAreas: ['Jhalawar', 'Jhalrapatan', 'Gagron', 'Bhawani Mandi'] },
  '327': { city: 'Banswara', state: 'Rajasthan', sampleAreas: ['Banswara', 'Mahi Dam', 'Kushalgarh'] },
  '328': { city: 'Dholpur', state: 'Rajasthan', sampleAreas: ['Dholpur', 'Machkund', 'Bari', 'Rajakhera'] },
  '331': { city: 'Churu', state: 'Rajasthan', sampleAreas: ['Churu', 'Salasar', 'Sujangarh', 'Ratangarh', 'Sardarshahar'] },
  '332': { city: 'Sikar', state: 'Rajasthan', sampleAreas: ['Sikar', 'Khatu Shyamji', 'Fatehpur Shekhawati', 'Laxmangarh'] },
  '333': { city: 'Mandawa', state: 'Rajasthan', sampleAreas: ['Mandawa', 'Jhunjhunu', 'Nawalgarh', 'Pilani', 'Dundlod', 'Alsisar'] },
  '334': { city: 'Bikaner', state: 'Rajasthan', sampleAreas: ['Bikaner', 'Lalgarh', 'Junagarh Area', 'Gajner', 'Deshnok', 'Nokha'] },
  '335': { city: 'Sri Ganganagar', state: 'Rajasthan', sampleAreas: ['Sri Ganganagar', 'Hanumangarh', 'Suratgarh', 'Anupgarh'] },
  '341': { city: 'Nagaur', state: 'Rajasthan', sampleAreas: ['Nagaur', 'Khimsar', 'Makrana', 'Didwana', 'Merta City', 'Kuchaman'] },
  '342': { city: 'Jodhpur', state: 'Rajasthan', sampleAreas: ['Ratanada', 'Sardarpura', 'Clock Tower', 'Mehrangarh Area', 'Mandore', 'Osian', 'Bishnoi Village'] },
  '343': { city: 'Jalore', state: 'Rajasthan', sampleAreas: ['Jalore', 'Bhinmal', 'Sanchore'] },
  '344': { city: 'Barmer', state: 'Rajasthan', sampleAreas: ['Barmer', 'Balotra', 'Kiradu', 'Nakoda'] },
  '345': { city: 'Jaisalmer', state: 'Rajasthan', sampleAreas: ['Jaisalmer Fort', 'Sam Sand Dunes', 'Khuri', 'Gadisar Lake', 'Kuldhara', 'Pokhran', 'Ramdevra'] },
  '360': { city: 'Rajkot', state: 'Gujarat', sampleAreas: ['Rajkot', 'Kalawad Road', 'Yagnik Road', 'Gondal', 'Jetpur'] },
  '361': { city: 'Dwarka', state: 'Gujarat', sampleAreas: ['Dwarka', 'Shivrajpur Beach', 'Bet Dwarka', 'Jamnagar', 'Khambhalia'] },
  '362': { city: 'Gir National Park (Sasan Gir)', state: 'Gujarat', sampleAreas: ['Sasan Gir', 'Somnath', 'Veraval', 'Junagadh', 'Diu', 'Nagoa Beach'] },
  '363': { city: 'Surendranagar', state: 'Gujarat', sampleAreas: ['Surendranagar', 'Morbi', 'Wankaner', 'Dasada (Little Rann of Kutch)', 'Dhrangadhra'] },
  '364': { city: 'Bhavnagar', state: 'Gujarat', sampleAreas: ['Bhavnagar', 'Palitana', 'Velavadar', 'Mahuva', 'Alang'] },
  '365': { city: 'Amreli', state: 'Gujarat', sampleAreas: ['Amreli', 'Dhari', 'Rajula', 'Pipavav'] },
  '370': { city: 'Kutch (Bhuj)', state: 'Gujarat', sampleAreas: ['Bhuj', 'Dhordo (Rann of Kutch)', 'Mandvi', 'Gandhidham', 'Adipur', 'Mundra', 'Dholavira'] },
  '380': { city: 'Ahmedabad', state: 'Gujarat', sampleAreas: ['SG Highway', 'Bodakdev', 'Satellite', 'Navrangpura', 'Prahlad Nagar', 'Vastrapur', 'CG Road', 'Maninagar'] },
  '382': { city: 'Gandhinagar', state: 'Gujarat', sampleAreas: ['Gandhinagar', 'GIFT City', 'Sanand', 'Bopal', 'Chandkheda', 'Adalaj'] },
  '383': { city: 'Sabarkantha (Himmatnagar)', state: 'Gujarat', sampleAreas: ['Himmatnagar', 'Idar', 'Polo Forest (Vijaynagar)', 'Modasa', 'Shamlaji'] },
  '384': { city: 'Mehsana', state: 'Gujarat', sampleAreas: ['Mehsana', 'Patan', 'Modhera', 'Vadnagar', 'Unjha'] },
  '385': { city: 'Banaskantha (Palanpur)', state: 'Gujarat', sampleAreas: ['Palanpur', 'Ambaji', 'Deesa', 'Dantiwada'] },
  '387': { city: 'Nadiad', state: 'Gujarat', sampleAreas: ['Nadiad', 'Dakor', 'Kheda', 'Kapadvanj'] },
  '388': { city: 'Anand', state: 'Gujarat', sampleAreas: ['Anand', 'Vallabh Vidyanagar', 'Karamsad', 'Khambhat'] },
  '389': { city: 'Godhra (Panchmahal)', state: 'Gujarat', sampleAreas: ['Godhra', 'Pavagadh', 'Champaner', 'Dahod', 'Halol'] },
  '390': { city: 'Vadodara (Baroda)', state: 'Gujarat', sampleAreas: ['Alkapuri', 'Sayajigunj', 'Gotri', 'Manjalpur', 'Fatehgunj', 'Vasna'] },
  '391': { city: 'Vadodara (Baroda)', state: 'Gujarat', sampleAreas: ['Kevadia (Statue of Unity)', 'Rajpipla', 'Chhota Udepur', 'Dabhoi', 'Padra'] },
  '392': { city: 'Bharuch', state: 'Gujarat', sampleAreas: ['Bharuch', 'Dahej', 'Jambusar'] },
  '393': { city: 'Ankleshwar', state: 'Gujarat', sampleAreas: ['Ankleshwar', 'Rajpipla', 'Dediapada'] },
  '394': { city: 'Surat', state: 'Gujarat', sampleAreas: ['Dumas', 'Hazira', 'Bardoli', 'Vyara', 'Kamrej', 'Sachin'] },
  '395': { city: 'Surat', state: 'Gujarat', sampleAreas: ['Vesu', 'Adajan', 'Piplod', 'Athwa', 'City Light', 'Varachha'] },
  '396': { city: 'Daman', state: 'Gujarat', sampleAreas: ['Daman', 'Devka Beach', 'Silvassa', 'Saputara', 'Vapi', 'Valsad', 'Navsari', 'Udvada'] },

  // ── ZONE 4: MAHARASHTRA (40-44), GOA (403), MADHYA PRADESH (45-48), CHHATTISGARH (49) ──
  '400': { city: 'Mumbai', state: 'Maharashtra', sampleAreas: ['Bandra', 'Juhu', 'Andheri', 'Colaba', 'Worli', 'Powai', 'Lower Parel', 'Malad', 'Borivali', 'Navi Mumbai', 'Vashi', 'Belapur'] },
  '401': { city: 'Palghar', state: 'Maharashtra', sampleAreas: ['Mira Road', 'Bhayandar', 'Vasai', 'Virar', 'Palghar', 'Boisar', 'Dahanu', 'Bordi', 'Kelva Beach', 'Vikramgad'] },
  '402': { city: 'Alibag', state: 'Maharashtra', sampleAreas: ['Alibag', 'Kihim', 'Nagaon', 'Mandwa', 'Awas', 'Varsoli', 'Akshi', 'Revdanda', 'Kashid', 'Murud', 'Kolad', 'Diveagar', 'Shrivardhan', 'Harihareshwar'] },
  '403': { city: 'Goa', state: 'Goa', sampleAreas: ['Calangute', 'Candolim', 'Baga', 'Anjuna', 'Vagator', 'Assagao', 'Siolim', 'Morjim', 'Arambol', 'Panaji', 'Margao', 'Colva', 'Benaulim', 'Palolem', 'Agonda'] },
  '410': { city: 'Lonavala', state: 'Maharashtra', sampleAreas: ['Lonavala', 'Khandala', 'Pawna Lake', 'Karjat', 'Matheran', 'Panvel', 'Kharghar', 'Khopoli', 'Chakan', 'Talegaon'] },
  '411': { city: 'Pune', state: 'Maharashtra', sampleAreas: ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Balewadi', 'Kothrud', 'Hinjewadi', 'Wakad', 'Kharadi', 'Shivajinagar', 'Camp'] },
  '412': { city: 'Mahabaleshwar', state: 'Maharashtra', sampleAreas: ['Mahabaleshwar', 'Panchgani', 'Mulshi', 'Lavasa', 'Wagholi', 'Wai', 'Bhor', 'Saswad', 'Jejuri', 'Baramati'] },
  '413': { city: 'Solapur', state: 'Maharashtra', sampleAreas: ['Solapur', 'Pandharpur', 'Akkalkot', 'Tuljapur', 'Osmanabad (Dharashiv)', 'Latur', 'Barshi'] },
  '414': { city: 'Ahmednagar', state: 'Maharashtra', sampleAreas: ['Ahmednagar', 'Shani Shingnapur', 'Rahuri', 'Parner', 'Pathardi', 'Jamkhed'] },
  '415': { city: 'Ratnagiri', state: 'Maharashtra', sampleAreas: ['Ratnagiri', 'Ganpatipule', 'Guhagar', 'Dapoli', 'Murud Harnai', 'Chiplun', 'Satara', 'Kaas Plateau', 'Karad', 'Koynanagar'] },
  '416': { city: 'Kolhapur', state: 'Maharashtra', sampleAreas: ['Kolhapur', 'Panhala', 'Malvan', 'Tarkarli', 'Sindhudurg', 'Sawantwadi', 'Vengurla', 'Devgad', 'Sangli', 'Amboli'] },
  '421': { city: 'Thane', state: 'Maharashtra', sampleAreas: ['Kalyan', 'Dombivli', 'Badlapur', 'Ambernath', 'Murbad', 'Malshej Ghat', 'Shahapur', 'Bhiwandi'] },
  '422': { city: 'Nashik', state: 'Maharashtra', sampleAreas: ['Nashik', 'Igatpuri', 'Trimbakeshwar', 'Sula Vineyards Area', 'Deolali', 'Sinnar', 'Bhandardara'] },
  '423': { city: 'Shirdi', state: 'Maharashtra', sampleAreas: ['Shirdi', 'Malegaon', 'Manmad', 'Yeola', 'Saputara Highway (Kalwan)', 'Kopargaon'] },
  '424': { city: 'Dhule', state: 'Maharashtra', sampleAreas: ['Dhule', 'Nandurbar', 'Toranmal', 'Chalisgaon', 'Shirpur'] },
  '425': { city: 'Jalgaon', state: 'Maharashtra', sampleAreas: ['Jalgaon', 'Bhusawal', 'Amalner', 'Pachora', 'Raver'] },
  '431': { city: 'Aurangabad (Chhatrapati Sambhaji Nagar)', state: 'Maharashtra', sampleAreas: ['Aurangabad', 'Ellora', 'Ajanta', 'Nanded', 'Parbhani', 'Jalna', 'Beed', 'Hingoli', 'Aundha Nagnath'] },
  '440': { city: 'Nagpur', state: 'Maharashtra', sampleAreas: ['Civil Lines', 'Dharampeth', 'Ramdaspeth', 'Sadar', 'Wardha Road', 'Manish Nagar'] },
  '441': { city: 'Nagpur', state: 'Maharashtra', sampleAreas: ['Pench (Sillari)', 'Ramtek', 'Khindsi', 'Bhandara', 'Gondia', 'Navegaon', 'Umred'] },
  '442': { city: 'Chandrapur', state: 'Maharashtra', sampleAreas: ['Tadoba (Moharli / Kolara)', 'Chandrapur', 'Wardha', 'Sevagram', 'Gadchiroli', 'Anandwan'] },
  '443': { city: 'Buldhana', state: 'Maharashtra', sampleAreas: ['Lonar Crater Lake', 'Buldhana', 'Shegaon', 'Khamgaon', 'Malkapur'] },
  '444': { city: 'Amravati', state: 'Maharashtra', sampleAreas: ['Amravati', 'Chikhaldara', 'Melghat', 'Akola', 'Washim'] },
  '445': { city: 'Yavatmal', state: 'Maharashtra', sampleAreas: ['Yavatmal', 'Tipeshwar', 'Pusad', 'Wani'] },
  '450': { city: 'Khandwa', state: 'Madhya Pradesh', sampleAreas: ['Omkareshwar', 'Khandwa', 'Hanuwantiya', 'Burhanpur', 'Asirgarh'] },
  '451': { city: 'Maheshwar', state: 'Madhya Pradesh', sampleAreas: ['Maheshwar', 'Mandleshwar', 'Khargone', 'Barwani', 'Sendhwa'] },
  '452': { city: 'Indore', state: 'Madhya Pradesh', sampleAreas: ['Vijay Nagar', 'Palasia', 'Rajwada', 'Bhawarkua', 'Rau', 'Super Corridor'] },
  '453': { city: 'Indore', state: 'Madhya Pradesh', sampleAreas: ['Mhow', 'Patalpani', 'Sanwer', 'Depalpur', 'Pithampur'] },
  '454': { city: 'Mandu (Mandavgad)', state: 'Madhya Pradesh', sampleAreas: ['Mandu', 'Dhar', 'Bagh', 'Kukshi'] },
  '455': { city: 'Dewas', state: 'Madhya Pradesh', sampleAreas: ['Dewas', 'Harda', 'Nemawar', 'Bagli'] },
  '456': { city: 'Ujjain', state: 'Madhya Pradesh', sampleAreas: ['Mahakaleshwar Area', 'Freeganj', 'Nanukheda', 'Nagda', 'Badnagar'] },
  '457': { city: 'Ratlam', state: 'Madhya Pradesh', sampleAreas: ['Ratlam', 'Jhabua', 'Alirajpur', 'Sailana', 'Jaora'] },
  '458': { city: 'Mandsaur', state: 'Madhya Pradesh', sampleAreas: ['Mandsaur', 'Gandhisagar', 'Neemuch', 'Pashupatinath Area'] },
  '460': { city: 'Betul', state: 'Madhya Pradesh', sampleAreas: ['Betul', 'Multai', 'Bhainsdehi', 'Amla'] },
  '461': { city: 'Pachmarhi', state: 'Madhya Pradesh', sampleAreas: ['Pachmarhi', 'Madhai (Satpura)', 'Hoshangabad (Narmadapuram)', 'Itarsi', 'Pipariya'] },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh', sampleAreas: ['Arera Colony', 'MP Nagar', 'Shyamla Hills', 'Upper Lake Area', 'Kolar Road', 'Habibganj'] },
  '464': { city: 'Sanchi', state: 'Madhya Pradesh', sampleAreas: ['Sanchi', 'Vidisha', 'Raisen', 'Bhimbetka', 'Bhojpur', 'Udayagiri'] },
  '465': { city: 'Rajgarh', state: 'Madhya Pradesh', sampleAreas: ['Rajgarh', 'Shajapur', 'Agar Malwa', 'Biaora'] },
  '466': { city: 'Sehore', state: 'Madhya Pradesh', sampleAreas: ['Sehore', 'Ashta', 'Budhni', 'Salkanpur'] },
  '470': { city: 'Sagar', state: 'Madhya Pradesh', sampleAreas: ['Sagar', 'Damoh', 'Nauradehi', 'Bina', 'Khurai'] },
  '471': { city: 'Khajuraho', state: 'Madhya Pradesh', sampleAreas: ['Khajuraho', 'Chhatarpur', 'Dhubela', 'Rajnagar'] },
  '472': { city: 'Orchha', state: 'Madhya Pradesh', sampleAreas: ['Orchha', 'Tikamgarh', 'Niwari', 'Kundeshwar'] },
  '473': { city: 'Shivpuri', state: 'Madhya Pradesh', sampleAreas: ['Shivpuri', 'Chanderi', 'Guna', 'Ashoknagar', 'Madhav National Park'] },
  '474': { city: 'Gwalior', state: 'Madhya Pradesh', sampleAreas: ['Lashkar', 'City Centre', 'Gwalior Fort Area', 'Morar', 'Thatipur'] },
  '475': { city: 'Datia', state: 'Madhya Pradesh', sampleAreas: ['Datia', 'Dabra', 'Sonagiri', 'Bhitargaon'] },
  '476': { city: 'Morena', state: 'Madhya Pradesh', sampleAreas: ['Morena', 'Kuno National Park (Sheopur)', 'Mitaoli', 'Padavali', 'Bateshwar'] },
  '477': { city: 'Bhind', state: 'Madhya Pradesh', sampleAreas: ['Bhind', 'Ater Fort', 'Lahar', 'Gohad'] },
  '480': { city: 'Pench (Seoni)', state: 'Madhya Pradesh', sampleAreas: ['Pench (Turia)', 'Seoni', 'Chhindwara', 'Patalkot', 'Tamia'] },
  '481': { city: 'Kanha (Mandla)', state: 'Madhya Pradesh', sampleAreas: ['Kanha (Khatia / Mukki)', 'Mandla', 'Balaghat', 'Baihar', 'Dindori'] },
  '482': { city: 'Jabalpur', state: 'Madhya Pradesh', sampleAreas: ['Civil Lines', 'Napier Town', 'Wright Town', 'Vijay Nagar', 'Sadar'] },
  '483': { city: 'Bhedaghat', state: 'Madhya Pradesh', sampleAreas: ['Bhedaghat', 'Bargi Dam', 'Katni', 'Sihora', 'Patan'] },
  '484': { city: 'Bandhavgarh', state: 'Madhya Pradesh', sampleAreas: ['Bandhavgarh (Tala)', 'Umaria', 'Shahdol', 'Amarkantak', 'Anuppur'] },
  '485': { city: 'Satna', state: 'Madhya Pradesh', sampleAreas: ['Satna', 'Maihar', 'Chitrakoot (MP)', 'Nagod'] },
  '486': { city: 'Rewa', state: 'Madhya Pradesh', sampleAreas: ['Rewa', 'Mukundpur', 'Sidhi', 'Sanjay Dubri', 'Singrauli'] },
  '487': { city: 'Narsinghpur', state: 'Madhya Pradesh', sampleAreas: ['Narsinghpur', 'Gadarwara', 'Kareli', 'Gotegaon'] },
  '488': { city: 'Panna', state: 'Madhya Pradesh', sampleAreas: ['Panna', 'Madla', 'Pandav Falls', 'Ajaygarh'] },
  '490': { city: 'Bhilai-Durg', state: 'Chhattisgarh', sampleAreas: ['Bhilai', 'Nehru Nagar', 'Civic Centre', 'Smriti Nagar'] },
  '491': { city: 'Bhilai-Durg', state: 'Chhattisgarh', sampleAreas: ['Durg', 'Rajnandgaon', 'Dongargarh', 'Kawardha (Bhoramdeo)', 'Chilpi', 'Balod', 'Bemetara'] },
  '492': { city: 'Raipur', state: 'Chhattisgarh', sampleAreas: ['Raipur', 'Naya Raipur', 'Telibandha', 'Shankar Nagar', 'Civil Lines', 'Pandri'] },
  '493': { city: 'Raipur', state: 'Chhattisgarh', sampleAreas: ['Sirpur', 'Barnawapara', 'Dhamtari', 'Gangrel', 'Mahasamund', 'Rajim', 'Bhatapara'] },
  '494': { city: 'Jagdalpur (Bastar)', state: 'Chhattisgarh', sampleAreas: ['Jagdalpur', 'Chitrakote', 'Tirathgarh', 'Kanker', 'Dantewada', 'Kondagaon', 'Narayanpur', 'Bijapur', 'Sukma'] },
  '495': { city: 'Bilaspur', state: 'Chhattisgarh', sampleAreas: ['Bilaspur', 'Achanakmar', 'Korba', 'Ratanpur', 'Janjgir-Champa', 'Mungeli'] },
  '496': { city: 'Raigarh', state: 'Chhattisgarh', sampleAreas: ['Raigarh', 'Jashpur', 'Sarangarh', 'Kharsia'] },
  '497': { city: 'Ambikapur (Surguja)', state: 'Chhattisgarh', sampleAreas: ['Mainpat', 'Ambikapur', 'Manendragarh', 'Baikunthpur (Koriya)', 'Surajpur', 'Balrampur'] },

  // ── ZONE 5: TELANGANA (50), ANDHRA PRADESH (51-53), KARNATAKA (56-59) ──
  '500': { city: 'Hyderabad', state: 'Telangana', sampleAreas: ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Begumpet', 'Secunderabad', 'Shamshabad'] },
  '501': { city: 'Hyderabad', state: 'Telangana', sampleAreas: ['Ramoji Film City', 'Ananthagiri Hills (Vikarabad)', 'Shamirpet', 'Moinabad', 'Chevella', 'Gandipet', 'Tandur'] },
  '502': { city: 'Sangareddy', state: 'Telangana', sampleAreas: ['Sangareddy', 'Medak', 'Siddipet', 'Zaheerabad', 'Patancheru'] },
  '503': { city: 'Nizamabad', state: 'Telangana', sampleAreas: ['Nizamabad', 'Kamareddy', 'Armoor', 'Bodhan'] },
  '504': { city: 'Adilabad', state: 'Telangana', sampleAreas: ['Adilabad', 'Kuntala', 'Nirmal', 'Basar', 'Mancherial', 'Kawal'] },
  '505': { city: 'Karimnagar', state: 'Telangana', sampleAreas: ['Karimnagar', 'Vemulawada', 'Jagtial', 'Dharmapuri', 'Ramagundam', 'Peddapalli', 'Kaleshwaram'] },
  '506': { city: 'Warangal', state: 'Telangana', sampleAreas: ['Warangal', 'Hanamkonda', 'Kazipet', 'Ramappa (Palampet)', 'Laknavaram', 'Pakhal', 'Jangaon', 'Mahabubabad'] },
  '507': { city: 'Khammam', state: 'Telangana', sampleAreas: ['Khammam', 'Bhadrachalam', 'Kothagudem', 'Parnasala', 'Kinnerasani', 'Sathupalli'] },
  '508': { city: 'Nalgonda', state: 'Telangana', sampleAreas: ['Nalgonda', 'Yadagirigutta (Yadadri)', 'Nagarjuna Sagar', 'Suryapet', 'Bhongir'] },
  '509': { city: 'Mahbubnagar', state: 'Telangana', sampleAreas: ['Mahbubnagar', 'Srisailam Highway (Mannanur / Farahabad)', 'Alampur', 'Gadwal', 'Nagarkurnool', 'Wanaparthy'] },
  '515': { city: 'Anantapur', state: 'Andhra Pradesh', sampleAreas: ['Anantapur', 'Puttaparthi', 'Lepakshi', 'Hindupur', 'Penukonda', 'Tadipatri'] },
  '516': { city: 'Kadapa (YSR)', state: 'Andhra Pradesh', sampleAreas: ['Kadapa', 'Gandikota', 'Jammalamadugu', 'Vontimitta', 'Proddatur', 'Rajampet'] },
  '517': { city: 'Tirupati', state: 'Andhra Pradesh', sampleAreas: ['Tirupati', 'Tirumala', 'Srikalahasti', 'Horsley Hills (Madanapalle)', 'Chittoor', 'Kanipakam', 'Kuppam', 'Talakona'] },
  '518': { city: 'Kurnool', state: 'Andhra Pradesh', sampleAreas: ['Kurnool', 'Srisailam', 'Mantralayam', 'Ahobilam', 'Nandyal', 'Mahanandi', 'Belum Caves', 'Orvakal'] },
  '520': { city: 'Vijayawada', state: 'Andhra Pradesh', sampleAreas: ['MG Road', 'Benz Circle', 'Gollapudi', 'Bhavani Island', 'Autonagar'] },
  '521': { city: 'Machilipatnam', state: 'Andhra Pradesh', sampleAreas: ['Machilipatnam', 'Gannavaram', 'Gudivada', 'Nuzvid', 'Kondapalli'] },
  '522': { city: 'Guntur', state: 'Andhra Pradesh', sampleAreas: ['Guntur', 'Amaravati', 'Mangalagiri', 'Tenali', 'Bapatla', 'Suryalanka Beach', 'Narasaraopet'] },
  '523': { city: 'Prakasam (Ongole)', state: 'Andhra Pradesh', sampleAreas: ['Ongole', 'Chirala', 'Vodarevu Beach', 'Markapur', 'Cumbum'] },
  '524': { city: 'Nellore', state: 'Andhra Pradesh', sampleAreas: ['Nellore', 'Mypadu Beach', 'Pulicat Lake (Sullurpeta)', 'Sriharikota', 'Kavali', 'Gudur'] },
  '530': { city: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', sampleAreas: ['RK Beach', 'Rushikonda', 'Bheemili', 'Siripuram', 'MVP Colony', 'Yarada', 'Madhurawada'] },
  '531': { city: 'Araku Valley', state: 'Andhra Pradesh', sampleAreas: ['Araku Valley', 'Borra Caves', 'Lambasingi', 'Paderu', 'Anakapalle', 'Narsipatnam'] },
  '532': { city: 'Srikakulam', state: 'Andhra Pradesh', sampleAreas: ['Srikakulam', 'Arasavalli', 'Baruva Beach', 'Kalingapatnam', 'Palasa'] },
  '533': { city: 'Rajahmundry', state: 'Andhra Pradesh', sampleAreas: ['Rajahmundry', 'Kakinada', 'Coringa', 'Maredumilli', 'Dindi', 'Amalapuram', 'Konaseema', 'Annavaram'] },
  '534': { city: 'Bhimavaram', state: 'Andhra Pradesh', sampleAreas: ['Bhimavaram', 'Eluru', 'Kolleru Lake', 'Palakollu', 'Narsapur', 'Tadepalligudem', 'Tanuku'] },
  '535': { city: 'Vizianagaram', state: 'Andhra Pradesh', sampleAreas: ['Vizianagaram', 'Bobbili', 'Parvathipuram', 'Salur'] },
  '560': { city: 'Bengaluru (Bangalore)', state: 'Karnataka', sampleAreas: ['Indiranagar', 'Koramangala', 'Whitefield', 'MG Road', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'Yelahanka', 'Electronic City', 'Sarjapur Road', 'Devanahalli'] },
  '561': { city: 'Nandi Hills', state: 'Karnataka', sampleAreas: ['Doddaballapur', 'Nandi Hills', 'Gauribidanur', 'Nelamangala'] },
  '562': { city: 'Ramanagara', state: 'Karnataka', sampleAreas: ['Ramanagara', 'Chikkaballapur', 'Nandi Hills', 'Kanakapura', 'Channapatna', 'Devanahalli', 'Hoskote'] },
  '563': { city: 'Kolar', state: 'Karnataka', sampleAreas: ['Kolar', 'KGF', 'Mulbagal', 'Chintamani', 'Bangarpet'] },
  '570': { city: 'Mysuru (Mysore)', state: 'Karnataka', sampleAreas: ['Gokulam', 'Vijayanagar', 'Jayalakshmipuram', 'Lakshmipuram', 'Chamundi Hill', 'Nazarbad'] },
  '571': { city: 'Coorg (Madikeri)', state: 'Karnataka', sampleAreas: ['Madikeri', 'Kushalnagar', 'Virajpet', 'Gonikoppal', 'Suntikoppa', 'Somwarpet', 'Kabini (HD Kote)', 'Bandipur (Gundlupet)', 'Srirangapatna', 'Mandya', 'Chamarajanagar', 'BR Hills'] },
  '572': { city: 'Tumakuru (Tumkur)', state: 'Karnataka', sampleAreas: ['Tumakuru', 'Devarayanadurga', 'Madhugiri', 'Tiptur', 'Sira'] },
  '573': { city: 'Sakleshpur', state: 'Karnataka', sampleAreas: ['Sakleshpur', 'Hassan', 'Belur', 'Halebidu', 'Shravanabelagola', 'Arsikere'] },
  '574': { city: 'Mangaluru (Mangalore)', state: 'Karnataka', sampleAreas: ['Dharmasthala', 'Kukke Subramanya', 'Puttur', 'Moodbidri', 'Bantwal', 'Sullia', 'Mulki'] },
  '575': { city: 'Mangaluru (Mangalore)', state: 'Karnataka', sampleAreas: ['Hampankatta', 'Kadri', 'Surathkal', 'Panambur Beach', 'Tannirbhavi', 'Ullal'] },
  '576': { city: 'Udupi', state: 'Karnataka', sampleAreas: ['Udupi', 'Malpe Beach', 'Manipal', 'Kaup (Kapu)', 'Maravanthe', 'Kundapura', 'Kollur', 'Karkala'] },
  '577': { city: 'Chikmagalur', state: 'Karnataka', sampleAreas: ['Chikmagalur', 'Mudigere', 'Kemmanagundi', 'Kalasa', 'Horanadu', 'Sringeri', 'Agumbe', 'Shimoga', 'Jog Falls', 'Thirthahalli', 'Davangere', 'Chitradurga'] },
  '580': { city: 'Hubballi-Dharwad', state: 'Karnataka', sampleAreas: ['Hubballi', 'Dharwad', 'Vidyanagar', 'Gokul Road', 'Unkal Lake'] },
  '581': { city: 'Gokarna', state: 'Karnataka', sampleAreas: ['Gokarna', 'Murudeshwar', 'Karwar', 'Dandeli', 'Yana', 'Sirsi', 'Kumta', 'Honnavar', 'Bhatkal', 'Haveri'] },
  '582': { city: 'Gadag', state: 'Karnataka', sampleAreas: ['Gadag', 'Lakkundi', 'Ron', 'Nargund'] },
  '583': { city: 'Hampi (Hospet)', state: 'Karnataka', sampleAreas: ['Hampi', 'Hospet (Hosapete)', 'Anegundi', 'Ballari (Bellary)', 'Sandur', 'Koppal'] },
  '584': { city: 'Raichur', state: 'Karnataka', sampleAreas: ['Raichur', 'Mantralayam Road', 'Sindhanur', 'Lingasugur'] },
  '585': { city: 'Kalaburagi (Gulbarga)', state: 'Karnataka', sampleAreas: ['Kalaburagi', 'Bidar', 'Basavakalyan', 'Yadgir', 'Sedam'] },
  '586': { city: 'Vijayapura (Bijapur)', state: 'Karnataka', sampleAreas: ['Vijayapura', 'Gol Gumbaz Area', 'Almatti', 'Indi'] },
  '587': { city: 'Badami', state: 'Karnataka', sampleAreas: ['Badami', 'Pattadakal', 'Aihole', 'Bagalkot', 'Kudalasangama', 'Jamkhandi'] },
  '590': { city: 'Belagavi (Belgaum)', state: 'Karnataka', sampleAreas: ['Belagavi', 'Tilakwadi', 'Camp', 'Khanapur', 'Chorla Ghat'] },
  '591': { city: 'Belagavi (Belgaum)', state: 'Karnataka', sampleAreas: ['Gokak', 'Chikkodi', 'Bailhongal', 'Saundatti', 'Athani'] },

  // ── ZONE 6: TAMIL NADU (60-64), PUDUCHERRY (605), KERALA (67-69), LAKSHADWEEP (682) ──
  '600': { city: 'Chennai', state: 'Tamil Nadu', sampleAreas: ['ECR (East Coast Road)', 'OMR', 'Adyar', 'Besant Nagar', 'T. Nagar', 'Mylapore', 'Anna Nagar', 'Nungambakkam', 'Guindy', 'Velachery', 'Kovalam'] },
  '601': { city: 'Chennai', state: 'Tamil Nadu', sampleAreas: ['Sriperumbudur', 'Oragadam', 'Ponneri', 'Pulicat', 'Gummidipoondi'] },
  '602': { city: 'Chennai', state: 'Tamil Nadu', sampleAreas: ['Tiruvallur', 'Tiruttani', 'Poondi'] },
  '603': { city: 'Mahabalipuram (Mamallapuram)', state: 'Tamil Nadu', sampleAreas: ['Mahabalipuram', 'Kovalam (Covelong)', 'Muttukadu', 'Chengalpattu', 'Vedanthangal', 'Kalpakkam', 'Madurantakam'] },
  '604': { city: 'Villupuram', state: 'Tamil Nadu', sampleAreas: ['Tindivanam', 'Gingee', 'Melmalayanur', 'Marakkanam'] },
  '605': { city: 'Pondicherry (Puducherry)', state: 'Puducherry', sampleAreas: ['White Town', 'Auroville', 'Serenity Beach', 'Heritage Town', 'Kottakuppam', 'Ariyankuppam', 'Villupuram'] },
  '606': { city: 'Tiruvannamalai', state: 'Tamil Nadu', sampleAreas: ['Tiruvannamalai', 'Ramana Ashram Area', 'Girivalam Path', 'Kallakurichi', 'Sathanur'] },
  '607': { city: 'Cuddalore', state: 'Tamil Nadu', sampleAreas: ['Cuddalore', 'Silver Beach', 'Neyveli', 'Panruti', 'Vadalur'] },
  '608': { city: 'Chidambaram', state: 'Tamil Nadu', sampleAreas: ['Chidambaram', 'Pichavaram Mangrove', 'Kattumannarkoil', 'Sirkazhi'] },
  '609': { city: 'Karaikal', state: 'Puducherry', sampleAreas: ['Karaikal', 'Tranquebar (Tharangambadi)', 'Mayiladuthurai', 'Poompuhar', 'Vaitheeswaran Koil'] },
  '610': { city: 'Tiruvarur', state: 'Tamil Nadu', sampleAreas: ['Tiruvarur', 'Thiruthuraipoondi', 'Nannilam'] },
  '611': { city: 'Velankanni', state: 'Tamil Nadu', sampleAreas: ['Velankanni', 'Nagapattinam', 'Nagore', 'Vedaranyam', 'Kodiyakarai (Point Calimere)'] },
  '612': { city: 'Kumbakonam', state: 'Tamil Nadu', sampleAreas: ['Kumbakonam', 'Darasuram', 'Swamimalai', 'Thirunageswaram'] },
  '613': { city: 'Thanjavur (Tanjore)', state: 'Tamil Nadu', sampleAreas: ['Thanjavur', 'Brihadeeswarar Temple Area', 'Thiruvaiyaru'] },
  '614': { city: 'Thanjavur (Tanjore)', state: 'Tamil Nadu', sampleAreas: ['Pattukkottai', 'Mannargudi', 'Aranthangi', 'Muthupet'] },
  '620': { city: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', sampleAreas: ['Cantonment', 'Thillai Nagar', 'Srirangam', 'Woraiyur', 'KK Nagar'] },
  '621': { city: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', sampleAreas: ['Samayapuram', 'Perambalur', 'Ariyalur', 'Gangaikonda Cholapuram', 'Lalgudi'] },
  '622': { city: 'Pudukkottai', state: 'Tamil Nadu', sampleAreas: ['Pudukkottai', 'Thirumayam', 'Sittannavasal', 'Avudaiyarkoil'] },
  '623': { city: 'Rameswaram', state: 'Tamil Nadu', sampleAreas: ['Rameswaram', 'Dhanushkodi', 'Pamban', 'Mandapam', 'Ramanathapuram', 'Karaikudi (Chettinad)', 'Kanadukathan'] },
  '624': { city: 'Kodaikanal', state: 'Tamil Nadu', sampleAreas: ['Kodaikanal', 'Vattakanal', 'Poombarai', 'Mannavanur', 'Dindigul', 'Palani', 'Sirumalai'] },
  '625': { city: 'Madurai', state: 'Tamil Nadu', sampleAreas: ['Meenakshi Temple Area', 'Anna Nagar', 'KK Nagar', 'Theni', 'Megamalai', 'Cumbum', 'Bodinayakanur'] },
  '626': { city: 'Virudhunagar', state: 'Tamil Nadu', sampleAreas: ['Srivilliputhur', 'Sivakasi', 'Rajapalayam', 'Virudhunagar', 'Aruppukkottai'] },
  '627': { city: 'Tirunelveli', state: 'Tamil Nadu', sampleAreas: ['Courtallam (Kutralam)', 'Tenkasi', 'Tirunelveli', 'Palayamkottai', 'Manjolai', 'Kalakkad'] },
  '628': { city: 'Thoothukudi (Tuticorin)', state: 'Tamil Nadu', sampleAreas: ['Thoothukudi', 'Tiruchendur', 'Kovilpatti', 'Manapad', 'Kayalpattinam'] },
  '629': { city: 'Kanyakumari', state: 'Tamil Nadu', sampleAreas: ['Kanyakumari', 'Nagercoil', 'Suchindram', 'Padmanabhapuram', 'Vattakottai', 'Colachel'] },
  '630': { city: 'Karaikudi (Chettinad)', state: 'Tamil Nadu', sampleAreas: ['Karaikudi', 'Kanadukathan', 'Athangudi', 'Sivaganga', 'Pillayarpatti'] },
  '631': { city: 'Kanchipuram', state: 'Tamil Nadu', sampleAreas: ['Kanchipuram', 'Sriperumbudur', 'Arakkonam', 'Tiruttani', 'Sholinghur'] },
  '632': { city: 'Vellore', state: 'Tamil Nadu', sampleAreas: ['Vellore', 'Sripuram Golden Temple', 'Ranipet', 'Arcot', 'Ambur', 'Gudiyatham'] },
  '635': { city: 'Yelagiri', state: 'Tamil Nadu', sampleAreas: ['Yelagiri Hills', 'Hosur', 'Krishnagiri', 'Tirupattur', 'Vaniyambadi', 'Denkanikottai'] },
  '636': { city: 'Yercaud', state: 'Tamil Nadu', sampleAreas: ['Yercaud', 'Salem', 'Mettur', 'Dharmapuri', 'Hogenakkal'] },
  '637': { city: 'Namakkal', state: 'Tamil Nadu', sampleAreas: ['Kolli Hills (Semmedu)', 'Namakkal', 'Tiruchengode', 'Rasipuram'] },
  '638': { city: 'Erode', state: 'Tamil Nadu', sampleAreas: ['Erode', 'Bhavani', 'Gobichettipalayam', 'Sathyamangalam', 'Hasanur', 'Perundurai'] },
  '639': { city: 'Karur', state: 'Tamil Nadu', sampleAreas: ['Karur', 'Kulithalai', 'Aravakurichi'] },
  '641': { city: 'Coimbatore', state: 'Tamil Nadu', sampleAreas: ['RS Puram', 'Race Course', 'Peelamedu', 'Gandhipuram', 'Isha Yoga Center (Velliangiri)', 'Mettupalayam', 'Tiruppur'] },
  '642': { city: 'Pollachi', state: 'Tamil Nadu', sampleAreas: ['Pollachi', 'Valparai', 'Topslip (Anamalai)', 'Udumalpet', 'Aliyar'] },
  '643': { city: 'Ooty (Udhagamandalam)', state: 'Tamil Nadu', sampleAreas: ['Ooty', 'Coonoor', 'Kotagiri', 'Masinagudi', 'Mudumalai', 'Gudalur', 'Avalanche', 'Lovedale'] },
  '670': { city: 'Kannur', state: 'Kerala', sampleAreas: ['Kannur', 'Muzhappilangad', 'Payyambalam', 'Thalassery', 'Mahe', 'Mananthavady', 'Thirunelli', 'Paithalmala'] },
  '671': { city: 'Bekal', state: 'Kerala', sampleAreas: ['Bekal', 'Kasaragod', 'Kanhangad', 'Nileshwar', 'Ranipuram', 'Valiyaparamba'] },
  '673': { city: 'Wayanad', state: 'Kerala', sampleAreas: ['Kalpetta', 'Vythiri', 'Meppadi', 'Sulthan Bathery', 'Kozhikode (Calicut)', 'Kappad Beach', 'Beypore'] },
  '676': { city: 'Malappuram', state: 'Kerala', sampleAreas: ['Malappuram', 'Kottakkal', 'Tirur', 'Ponnani', 'Perinthalmanna'] },
  '678': { city: 'Palakkad', state: 'Kerala', sampleAreas: ['Palakkad', 'Silent Valley', 'Malampuzha', 'Nelliyampathy', 'Attappadi', 'Kollengode'] },
  '679': { city: 'Nilambur', state: 'Kerala', sampleAreas: ['Nilambur', 'Shoranur', 'Ottapalam', 'Pattambi', 'Cheruthuruthy'] },
  '680': { city: 'Thrissur', state: 'Kerala', sampleAreas: ['Thrissur', 'Guruvayur', 'Chavakkad', 'Kodungallur', 'Irinjalakuda', 'Punnathur Kotta'] },
  '682': { city: 'Kochi (Cochin)', state: 'Kerala', sampleAreas: ['Fort Kochi', 'Mattancherry', 'Marine Drive', 'Panampilly Nagar', 'Kakkanad', 'Edappally', 'Cherai Beach', 'Kumbalangi', 'Agatti (Lakshadweep)'] },
  '683': { city: 'Athirappilly', state: 'Kerala', sampleAreas: ['Athirappilly', 'Nedumbassery (Cochin Airport)', 'Aluva', 'Angamaly', 'Kalady', 'Perumbavoor', 'Paravur'] },
  '685': { city: 'Munnar', state: 'Kerala', sampleAreas: ['Munnar', 'Chinnakanal', 'Suryanelli', 'Thekkady (Kumily)', 'Vagamon', 'Idukki', 'Ramakkalmedu', 'Thodupuzha', 'Marayoor'] },
  '686': { city: 'Kumarakom', state: 'Kerala', sampleAreas: ['Kumarakom', 'Kottayam', 'Pala', 'Illikkal Kallu', 'Kothamangalam', 'Thattekad', 'Muvattupuzha', 'Changanassery'] },
  '688': { city: 'Alleppey (Alappuzha)', state: 'Kerala', sampleAreas: ['Alleppey Backwaters', 'Punnamada', 'Mararikulam (Marari Beach)', 'Kuttanad', 'Cherthala', 'Ambalappuzha'] },
  '689': { city: 'Pathanamthitta', state: 'Kerala', sampleAreas: ['Gavi', 'Aranmula', 'Thiruvalla', 'Pathanamthitta', 'Sabarimala', 'Konni', 'Chengannur'] },
  '690': { city: 'Kollam (Quilon)', state: 'Kerala', sampleAreas: ['Kayamkulam', 'Karunagappally', 'Amritapuri', 'Haripad', 'Mavelikkara', 'Sasthamkotta'] },
  '691': { city: 'Kollam (Quilon)', state: 'Kerala', sampleAreas: ['Ashtamudi Lake', 'Munroe Island', 'Thangassery', 'Thenmala', 'Palaruvi', 'Paravur (Kollam)', 'Punalur'] },
  '695': { city: 'Thiruvananthapuram (Trivandrum)', state: 'Kerala', sampleAreas: ['Varkala', 'Kovalam', 'Poovar', 'Ponmudi', 'Kowdiar', 'Technopark', 'Shangumugham', 'Neyyar Dam'] },

  // ── ZONE 7: WEST BENGAL (70-74), SIKKIM (737), ANDAMAN (744), ODISHA (75-77), ASSAM & NORTHEAST (78-79) ──
  '700': { city: 'Kolkata', state: 'West Bengal', sampleAreas: ['Park Street', 'Salt Lake', 'New Town (Rajarhat)', 'Ballygunge', 'Alipore', 'Howrah', 'Esplanade', 'Tollygunge', 'Dum Dum'] },
  '711': { city: 'Howrah', state: 'West Bengal', sampleAreas: ['Howrah', 'Shibpur', 'Belur Math', 'Santragachi', 'Uluberia'] },
  '712': { city: 'Hooghly (Chinsurah)', state: 'West Bengal', sampleAreas: ['Chinsurah', 'Chandannagar', 'Bandel', 'Serampore', 'Tarakeswar', 'Kamarpukur'] },
  '713': { city: 'Durgapur', state: 'West Bengal', sampleAreas: ['Durgapur', 'Asansol', 'Burdwan (Bardhaman)', 'Kalna', 'Katwa', 'Maithon'] },
  '721': { city: 'Digha', state: 'West Bengal', sampleAreas: ['Digha', 'Mandarmani', 'Tajpur', 'Shankarpur', 'Haldia', 'Kharagpur', 'Medinipur', 'Jhargram'] },
  '722': { city: 'Bankura', state: 'West Bengal', sampleAreas: ['Bishnupur', 'Mukutmanipur', 'Susunia', 'Bankura'] },
  '723': { city: 'Purulia', state: 'West Bengal', sampleAreas: ['Ajodhya Hills', 'Garhpanchkot', 'Baranti', 'Purulia'] },
  '731': { city: 'Shantiniketan (Bolpur)', state: 'West Bengal', sampleAreas: ['Shantiniketan', 'Bolpur', 'Tarapith', 'Suri', 'Bakreshwar', 'Rampurhat'] },
  '732': { city: 'Malda', state: 'West Bengal', sampleAreas: ['Malda', 'Gaur', 'Pandua', 'English Bazar'] },
  '733': { city: 'Raiganj', state: 'West Bengal', sampleAreas: ['Raiganj', 'Kulik', 'Balurghat', 'Islampur'] },
  '734': { city: 'Darjeeling', state: 'West Bengal', sampleAreas: ['Darjeeling Mall Road', 'Kalimpong', 'Kurseong', 'Mirik', 'Siliguri', 'Lava', 'Rishop', 'Sandakphu', 'Tiger Hill', 'Takdah'] },
  '735': { city: 'Dooars', state: 'West Bengal', sampleAreas: ['Lataguri (Gorumara)', 'Jaldapara', 'Murti', 'Samsing', 'Chalsa', 'Jalpaiguri', 'Alipurduar', 'Buxa', 'Jayanti'] },
  '736': { city: 'Cooch Behar', state: 'West Bengal', sampleAreas: ['Cooch Behar', 'Chilapata', 'Rasikbil', 'Dinhata'] },
  '737': { city: 'Gangtok', state: 'Sikkim', sampleAreas: ['Gangtok MG Marg', 'Pelling', 'Lachung', 'Lachen', 'Ravangla', 'Namchi', 'Yuksom', 'Zuluk', 'Rinchenpong', 'Tsomgo'] },
  '741': { city: 'Nadia (Krishnanagar)', state: 'West Bengal', sampleAreas: ['Mayapur', 'Nabadwip', 'Krishnanagar', 'Kalyani', 'Shantipur', 'Bethuadahari'] },
  '742': { city: 'Murshidabad', state: 'West Bengal', sampleAreas: ['Murshidabad', 'Hazarduari Area', 'Berhampore', 'Jiaganj', 'Kandi'] },
  '743': { city: 'Sundarbans', state: 'West Bengal', sampleAreas: ['Gosaba (Sundarbans)', 'Dayapur', 'Pakhiralay', 'Canning', 'Bakkhali', 'Henry Island', 'Diamond Harbour', 'Raichak', 'Taki'] },
  '744': { city: 'Port Blair (Sri Vijaya Puram)', state: 'Andaman & Nicobar Islands', sampleAreas: ['Port Blair', 'Havelock Island (Swaraj Dweep)', 'Neil Island (Shaheed Dweep)', 'Radhanagar Beach', 'Wandoor', 'Chidiya Tapu', 'Baratang', 'Diglipur'] },
  '751': { city: 'Bhubaneswar', state: 'Odisha', sampleAreas: ['Patia', 'Saheed Nagar', 'Jayadev Vihar', 'Old Town', 'Khandagiri', 'Chandrasekharpur'] },
  '752': { city: 'Puri', state: 'Odisha', sampleAreas: ['Puri Golden Beach', 'Swargadwar', 'Marine Drive', 'Konark', 'Chilika (Satapada / Barkul)', 'Khordha', 'Pipili'] },
  '753': { city: 'Cuttack', state: 'Odisha', sampleAreas: ['Cuttack', 'CDA', 'Buxiibazar', 'Choudwar'] },
  '754': { city: 'Paradip', state: 'Odisha', sampleAreas: ['Bhitarkanika', 'Paradip', 'Kendrapara', 'Jagatsinghpur', 'Ratnagiri (Odisha)'] },
  '755': { city: 'Jajpur', state: 'Odisha', sampleAreas: ['Jajpur', 'Udayagiri', 'Lalitgiri', 'Vyasanagar'] },
  '756': { city: 'Chandipur', state: 'Odisha', sampleAreas: ['Chandipur Beach', 'Balasore', 'Panchalingeswar', 'Talasari Beach', 'Bhadrak', 'Aradi'] },
  '757': { city: 'Similipal (Baripada)', state: 'Odisha', sampleAreas: ['Baripada', 'Similipal', 'Lulung', 'Rairangpur', 'Jashipur'] },
  '758': { city: 'Keonjhar', state: 'Odisha', sampleAreas: ['Keonjhar', 'Sanaghagara', 'Ghatagaon', 'Barbil'] },
  '759': { city: 'Angul', state: 'Odisha', sampleAreas: ['Satkosia Gorge (Tikarpada)', 'Dhenkanal', 'Kapilash', 'Angul', 'Talcher'] },
  '760': { city: 'Gopalpur-on-Sea', state: 'Odisha', sampleAreas: ['Gopalpur-on-Sea', 'Berhampur (Brahmapur)', 'Tampara Lake', 'Pati Sonepur'] },
  '761': { city: 'Chilika Lake (Barkul / Rambha)', state: 'Odisha', sampleAreas: ['Rambha (Chilika)', 'Jirang', 'Taptapani', 'Ganjam', 'Chhatrapur', 'Bhanjanagar'] },
  '762': { city: 'Daringbadi', state: 'Odisha', sampleAreas: ['Daringbadi', 'Phulbani', 'Belghar', 'Baliguda', 'Boudh'] },
  '763': { city: 'Koraput', state: 'Odisha', sampleAreas: ['Sunabeda', 'Damanjodi', 'Deomali', 'Duduma'] },
  '764': { city: 'Koraput', state: 'Odisha', sampleAreas: ['Koraput', 'Jeypore', 'Gupteswar', 'Malkangiri', 'Nabarangpur'] },
  '765': { city: 'Rayagada', state: 'Odisha', sampleAreas: ['Rayagada', 'Chatikona', 'Gunupur', 'Paralakhemundi', 'Mahendragiri'] },
  '766': { city: 'Kalahandi (Bhawanipatna)', state: 'Odisha', sampleAreas: ['Bhawanipatna', 'Phurlijharan', 'Karlapat', 'Nuapada'] },
  '767': { city: 'Balangir', state: 'Odisha', sampleAreas: ['Balangir', 'Harishankar', 'Ranipur Jharial', 'Titlagarh', 'Sonepur'] },
  '768': { city: 'Sambalpur', state: 'Odisha', sampleAreas: ['Sambalpur', 'Hirakud Dam', 'Debrigarh', 'Nrusinghanath', 'Bargarh', 'Jharsuguda'] },
  '769': { city: 'Rourkela', state: 'Odisha', sampleAreas: ['Rourkela', 'Vedvyas', 'Khandadhar', 'Sundargarh'] },
  '770': { city: 'Rourkela', state: 'Odisha', sampleAreas: ['Sundargarh', 'Rajgangpur', 'Bonai'] },
  '781': { city: 'Guwahati', state: 'Assam', sampleAreas: ['Paltan Bazar', 'GS Road', 'Kamakhya', 'Dispur', 'Beltola', 'Panbazar', 'Uzan Bazar', 'Manas (Barpeta Road)', 'Nalbari'] },
  '782': { city: 'Nagaon (Assam)', state: 'Assam', sampleAreas: ['Kaziranga (Bagori / Burapahar)', 'Nagaon', 'Diphu', 'Morigaon', 'Pobitora'] },
  '783': { city: 'Bongaigaon', state: 'Assam', sampleAreas: ['Bongaigaon', 'Kokrajhar', 'Goalpara', 'Dhubri', 'Manas'] },
  '784': { city: 'Tezpur', state: 'Assam', sampleAreas: ['Tezpur', 'Nameri', 'Bhalukpong', 'Orang', 'Biswanath Chariali', 'Mangaldai'] },
  '785': { city: 'Kaziranga', state: 'Assam', sampleAreas: ['Kaziranga (Kohora)', 'Majuli', 'Jorhat', 'Golaghat', 'Sivasagar', 'Charaideo'] },
  '786': { city: 'Dibrugarh', state: 'Assam', sampleAreas: ['Dibrugarh', 'Tinsukia', 'Digboi', 'Dibru-Saikhowa', 'Margherita', 'Naharkatiya'] },
  '787': { city: 'Lakhimpur (North Lakhimpur)', state: 'Assam', sampleAreas: ['North Lakhimpur', 'Dhemaji', 'Jonai'] },
  '788': { city: 'Silchar', state: 'Assam', sampleAreas: ['Haflong', 'Umrangso', 'Jatinga', 'Silchar', 'Karimganj', 'Hailakandi'] },
  '790': { city: 'Tawang', state: 'Arunachal Pradesh', sampleAreas: ['Tawang', 'Bomdila', 'Dirang', 'Bhalukpong', 'Shergaon', 'Sela'] },
  '791': { city: 'Itanagar', state: 'Arunachal Pradesh', sampleAreas: ['Ziro Valley', 'Itanagar', 'Naharlagun', 'Pasighat', 'Aalo', 'Mechuka'] },
  '792': { city: 'Roing (Mayudia)', state: 'Arunachal Pradesh', sampleAreas: ['Roing', 'Mayudia', 'Tezu', 'Namsai', 'Anini', 'Miao (Namdapha)', 'Khonsa'] },
  '793': { city: 'Shillong', state: 'Meghalaya', sampleAreas: ['Police Bazar', 'Laitumkhrah', 'Cherrapunji (Sohra)', 'Dawki', 'Mawlynnong', 'Umiam Lake', 'Jowai', 'Mawsynram', 'Nongstoin'] },
  '794': { city: 'Tura (Garo Hills)', state: 'Meghalaya', sampleAreas: ['Tura', 'Nokrek', 'Siju', 'Williamnagar', 'Baghmara'] },
  '795': { city: 'Imphal', state: 'Manipur', sampleAreas: ['Imphal', 'Loktak Lake (Moirang)', 'Ukhrul', 'Churachandpur', 'Moreh', 'Senapati'] },
  '796': { city: 'Aizawl', state: 'Mizoram', sampleAreas: ['Aizawl', 'Reiek', 'Champhai', 'Lunglei', 'Thenzawl', 'Serchhip', 'Kolasib'] },
  '797': { city: 'Kohima', state: 'Nagaland', sampleAreas: ['Kohima', 'Khonoma', 'Dzukou', 'Dimapur', 'Chumukedima', 'Wokha', 'Phek'] },
  '798': { city: 'Mokokchung', state: 'Nagaland', sampleAreas: ['Mokokchung', 'Mon', 'Longwa', 'Tuensang', 'Zunheboto'] },
  '799': { city: 'Agartala', state: 'Tripura', sampleAreas: ['Agartala', 'Udaipur (Neermahal)', 'Unakoti (Kailashahar)', 'Jampui Hills', 'Dharmanagar'] },

  // ── ZONE 8: BIHAR (80-82, 84-85) & JHARKHAND (81-83) ──
  '800': { city: 'Patna', state: 'Bihar', sampleAreas: ['Boring Road', 'Frazer Road', 'Kankarbagh', 'Exhibition Road', 'Rajendra Nagar', 'Bailey Road'] },
  '801': { city: 'Patna', state: 'Bihar', sampleAreas: ['Danapur', 'Patliputra', 'Phulwari Sharif', 'Bihta', 'Maner'] },
  '802': { city: 'Ara (Bhojpur)', state: 'Bihar', sampleAreas: ['Ara', 'Buxar', 'Dumraon', 'Jagdishpur'] },
  '803': { city: 'Rajgir', state: 'Bihar', sampleAreas: ['Rajgir', 'Nalanda', 'Pawapuri', 'Bihar Sharif', 'Barh', 'Mokama'] },
  '804': { city: 'Jehanabad', state: 'Bihar', sampleAreas: ['Jehanabad', 'Barabar Caves', 'Arwal', 'Masaurhi'] },
  '805': { city: 'Nawada', state: 'Bihar', sampleAreas: ['Kakolat', 'Nawada', 'Jamui', 'Lakhisarai', 'Sheikhpura'] },
  '811': { city: 'Munger', state: 'Bihar', sampleAreas: ['Munger', 'Bihar School of Yoga Area', 'Bhimbandh', 'Jamalpur', 'Simultala'] },
  '812': { city: 'Bhagalpur', state: 'Bihar', sampleAreas: ['Bhagalpur', 'Tilka Manjhi', 'Sultanganj'] },
  '813': { city: 'Bhagalpur', state: 'Bihar', sampleAreas: ['Vikramshila (Kahalgaon)', 'Mandar Hill (Banka)', 'Naugachia'] },
  '814': { city: 'Deoghar', state: 'Jharkhand', sampleAreas: ['Deoghar', 'Baidyanath Dham', 'Trikut', 'Dumka', 'Massanjore', 'Basukinath', 'Godda'] },
  '815': { city: 'Giridih', state: 'Jharkhand', sampleAreas: ['Parasnath (Madhuban)', 'Giridih', 'Usri Falls', 'Jamtara', 'Maithon'] },
  '816': { city: 'Sahibganj', state: 'Jharkhand', sampleAreas: ['Sahibganj', 'Rajmahal', 'Pakur', 'Barharwa'] },
  '821': { city: 'Sasaram (Rohtas)', state: 'Bihar', sampleAreas: ['Sasaram', 'Rohtasgarh', 'Tutla Bhawani', 'Bhabua (Kaimur)', 'Dehri-on-Sone'] },
  '822': { city: 'Daltonganj', state: 'Jharkhand', sampleAreas: ['Betla National Park', 'Netarhat', 'Daltonganj (Medininagar)', 'Latehar', 'Garhwa', 'McCluskieganj'] },
  '823': { city: 'Bodh Gaya', state: 'Bihar', sampleAreas: ['Bodh Gaya', 'Mahabodhi Temple Area', 'Gaya', 'Vishnupad'] },
  '824': { city: 'Bodh Gaya', state: 'Bihar', sampleAreas: ['Bodh Gaya', 'Sherghati', 'Aurangabad (Bihar)', 'Deo', 'Chatra', 'Itkhori'] },
  '825': { city: 'Hazaribagh', state: 'Jharkhand', sampleAreas: ['Hazaribagh', 'Canary Hill', 'Koderma', 'Tilaiya Dam', 'Rajrappa', 'Patratu'] },
  '826': { city: 'Dhanbad', state: 'Jharkhand', sampleAreas: ['Dhanbad', 'Hirapur', 'Saraidhela', 'Topchanchi'] },
  '827': { city: 'Bokaro', state: 'Jharkhand', sampleAreas: ['Bokaro Steel City', 'Sector 4', 'Chas', 'Tenughat'] },
  '828': { city: 'Dhanbad', state: 'Jharkhand', sampleAreas: ['Maithon Dam', 'Panchet', 'Jharia', 'Sindri', 'Katras'] },
  '829': { city: 'Ramgarh', state: 'Jharkhand', sampleAreas: ['Patratu Valley', 'Ramgarh', 'McCluskieganj', 'Barkakana', 'Gomia'] },
  '831': { city: 'Jamshedpur', state: 'Jharkhand', sampleAreas: ['Bistupur', 'Sakchi', 'Sonari', 'Kadma', 'Jubilee Park', 'Mango', 'Telco'] },
  '832': { city: 'Jamshedpur', state: 'Jharkhand', sampleAreas: ['Dalma Hills', 'Chandil', 'Ghatshila', 'Galudih', 'Saraikela', 'Adityapur'] },
  '833': { city: 'Chaibasa', state: 'Jharkhand', sampleAreas: ['Kiriburu (Saranda)', 'Chaibasa', 'Chakradharpur', 'Noamundi'] },
  '834': { city: 'Ranchi', state: 'Jharkhand', sampleAreas: ['Main Road Ranchi', 'Lalpur', 'Doranda', 'Morabadi', 'Kanke Road', 'Hinoo', 'HEC'] },
  '835': { city: 'Ranchi', state: 'Jharkhand', sampleAreas: ['Hundru Falls', 'Jonha Falls', 'Dassam Falls', 'Netarhat', 'Khunti', 'Gumla', 'Lohardaga', 'Simdega'] },
  '841': { city: 'Chapra (Saran)', state: 'Bihar', sampleAreas: ['Chapra', 'Sonepur', 'Siwan', 'Gopalganj', 'Thawe'] },
  '842': { city: 'Muzaffarpur', state: 'Bihar', sampleAreas: ['Muzaffarpur', 'Mithanpura', 'Motijheel', 'Kanti'] },
  '843': { city: 'Sitamarhi', state: 'Bihar', sampleAreas: ['Sitamarhi', 'Vaishali', 'Sheohar', 'Pupri'] },
  '844': { city: 'Vaishali', state: 'Bihar', sampleAreas: ['Vaishali', 'Hajipur', 'Mahua', 'Lalganj'] },
  '845': { city: 'Valmiki Nagar (West Champaran)', state: 'Bihar', sampleAreas: ['Valmiki Nagar', 'Bettiah', 'Motihari', 'Raxaul', 'Narkatiaganj', 'Lauriya'] },
  '846': { city: 'Darbhanga', state: 'Bihar', sampleAreas: ['Darbhanga', 'Laheriasarai', 'Kameshwar Nagar'] },
  '847': { city: 'Madhubani', state: 'Bihar', sampleAreas: ['Madhubani', 'Jitwarpur', 'Rajnagar', 'Jhanjharpur', 'Jaynagar'] },
  '848': { city: 'Samastipur', state: 'Bihar', sampleAreas: ['Samastipur', 'Pusa', 'Dalsinghsarai', 'Rosera'] },
  '851': { city: 'Begusarai', state: 'Bihar', sampleAreas: ['Begusarai', 'Kanwar Lake', 'Khagaria', 'Barauni'] },
  '852': { city: 'Saharsa', state: 'Bihar', sampleAreas: ['Saharsa', 'Madhepura', 'Supaul', 'Singheshwar'] },
  '853': { city: 'Bhagalpur', state: 'Bihar', sampleAreas: ['Naugachia', 'Bihpur', 'Gopalpur'] },
  '854': { city: 'Purnia', state: 'Bihar', sampleAreas: ['Purnia', 'Katihar', 'Araria', 'Forbesganj'] },
  '855': { city: 'Kishanganj', state: 'Bihar', sampleAreas: ['Kishanganj', 'Thakurganj', 'Bahadurganj'] }
}

// Clean and normalize district names from government postal records
function cleanDistrictName(district: string, prefix3?: string, exactMatch?: { city: string }): string {
  if (exactMatch?.city) return exactMatch.city
  if (!district) return prefix3 && PIN_PREFIX_MAP[prefix3] ? PIN_PREFIX_MAP[prefix3].city : ''
  const cleaned = district.replace(/\s*\([A-Za-z]+\)\s*/g, '').trim()
  const lower = cleaned.toLowerCase()

  if (lower === 'raigarh' || lower === 'raigad' || lower === 'raigarh mh' || lower === 'raigarh(mh)') {
    if (prefix3 === '410') return 'Lonavala'
    return 'Alibag'
  }
  if (lower === 'north goa' || lower === 'south goa') return cleaned
  if (lower === 'bangalore' || lower === 'bengaluru' || lower === 'bengaluru urban' || lower === 'bengaluru rural') return 'Bengaluru (Bangalore)'
  if (lower === 'mysore' || lower === 'mysuru') return 'Mysuru (Mysore)'
  if (lower === 'kodagu') return 'Coorg (Madikeri)'
  if (lower === 'chikkamagaluru' || lower === 'chikmagalur') return 'Chikmagalur'
  if (lower === 'dakshina kannada') return 'Mangaluru (Mangalore)'
  if (lower === 'uttara kannada') return prefix3 === '581' ? 'Gokarna' : 'Karwar'
  if (lower === 'nilgiris' || lower === 'the nilgiris') return 'Ooty (Udhagamandalam)'
  if (lower === 'ernakulam') return 'Kochi (Cochin)'
  if (lower === 'alappuzha') return 'Alleppey (Alappuzha)'
  if (lower === 'idukki') return 'Munnar'
  if (lower === 'thiruvananthapuram') return 'Thiruvananthapuram (Trivandrum)'
  if (lower === 'gurgaon' || lower === 'gurugram') return 'Gurugram (Gurgaon)'
  if (lower === 'gautam buddha nagar') return 'Noida'
  if (lower === 'bombay' || lower === 'mumbai suburban' || lower === 'mumbai city') return 'Mumbai'
  if (lower === 'kullu' && prefix3 === '175') return 'Manali'
  if (lower === 'tehri garhwal' && prefix3 === '249') return 'Rishikesh'
  if (lower === 'visakhapatnam') return 'Visakhapatnam (Vizag)'
  if (lower === 'pondicherry' || lower === 'puducherry') return 'Pondicherry (Puducherry)'
  if (lower === 'south andaman' || lower === 'north and middle andaman') return 'Port Blair (Sri Vijaya Puram)'
  if (lower.includes('delhi')) return 'New Delhi'

  // Match againstINDIAN_STATES_AND_CITIES if possible
  for (const cities of Object.values(INDIAN_STATES_AND_CITIES)) {
    const exact = cities.find(c => c.toLowerCase() === lower || c.toLowerCase().startsWith(`${lower} (`))
    if (exact) return exact
  }

  return cleaned
}

/**
 * Exhaustive Indian Pincode Auto-detection across the entire database.
 * Combines:
 * 1. Exact 6-digit overrides (`EXACT_PINCODE_MAP`)
 * 2. Live India Post (`api.postalpincode.in`) & Zippopotam (`api.zippopotam.us/IN`) lookups for granular post office sub-localities
 * 3. Complete 3-digit Indian Postal Sorting District database (`110` to `855`)
 */
export async function lookupIndianPincode(pincode: string): Promise<LocationLookupResult> {
  const cleanPin = (pincode || '').trim().replace(/\D/g, '')

  if (!/^[1-8][0-9]{5}$/.test(cleanPin)) {
    return {
      success: false,
      pincode: cleanPin,
      error: 'Please enter a valid 6-digit Indian PIN code (starting with 1-8).'
    }
  }

  const prefix3 = cleanPin.slice(0, 3)
  const prefix2 = cleanPin.slice(0, 2)
  const exactOverride = EXACT_PINCODE_MAP[cleanPin]
  const sortingDistrict = PIN_PREFIX_MAP[prefix3] || Object.entries(PIN_PREFIX_MAP).find(([k]) => k.startsWith(prefix2))?.[1]

  // 1. Query India Post API & Zippopotam in parallel with a fast 2.8s timeout for exact Post Office names
  try {
    const fetchIndiaPost = async () => {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 2800)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        if (!res.ok) throw new Error('IndiaPost HTTP error')
        const data = await res.json()
        if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
          const postOffices = data[0].PostOffice
          const first = postOffices[0]
          const rawDistrict = first?.District || first?.Block || ''
          const city = cleanDistrictName(rawDistrict, prefix3, exactOverride)
          const state = exactOverride?.state || first?.State || sortingDistrict?.state || ''
          const liveAreas = postOffices.map((p: any) => p.Name?.trim()).filter(Boolean) as string[]
          const combinedAreas = Array.from(new Set([...(exactOverride?.areas || []), ...liveAreas]))
          return {
            success: true as const,
            pincode: cleanPin,
            city: city || combinedAreas[0] || sortingDistrict?.city || 'India',
            district: rawDistrict || city,
            state,
            areas: combinedAreas.length > 0 ? combinedAreas : [city]
          }
        }
        throw new Error('No post office found')
      } finally {
        clearTimeout(t)
      }
    }

    const fetchZippopotam = async () => {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 2500)
      try {
        const res = await fetch(`https://api.zippopotam.us/IN/${cleanPin}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        if (!res.ok) throw new Error('Zippopotam HTTP error')
        const data = await res.json()
        if (Array.isArray(data?.places) && data.places.length > 0) {
          const liveAreas = data.places.map((p: any) => p['place name']?.trim()).filter(Boolean) as string[]
          const state = exactOverride?.state || data.places[0]?.state || sortingDistrict?.state || ''
          const city = exactOverride?.city || sortingDistrict?.city || cleanDistrictName(liveAreas[0] || '', prefix3)
          const combinedAreas = Array.from(new Set([...(exactOverride?.areas || []), ...liveAreas, ...(sortingDistrict?.sampleAreas || [])]))
          return {
            success: true as const,
            pincode: cleanPin,
            city: city || liveAreas[0],
            district: city || liveAreas[0],
            state,
            areas: combinedAreas.length > 0 ? combinedAreas : [city]
          }
        }
        throw new Error('No places found')
      } finally {
        clearTimeout(t)
      }
    }

    // Prefer India Post first, fallback to Zippopotam if India Post fails or times out
    try {
      return await fetchIndiaPost()
    } catch {
      return await fetchZippopotam()
    }
  } catch {
    // Proceed to instant offline sorting district resolution
  }

  // 2. Exact 6-digit match in offline database
  if (exactOverride) {
    return {
      success: true,
      pincode: cleanPin,
      city: exactOverride.city,
      district: exactOverride.city,
      state: exactOverride.state,
      areas: exactOverride.areas
    }
  }

  // 3. Complete 3-digit Indian Sorting District match (covers 110 to 855 across all of India)
  if (sortingDistrict) {
    return {
      success: true,
      pincode: cleanPin,
      city: sortingDistrict.city,
      district: sortingDistrict.city,
      state: sortingDistrict.state,
      areas: sortingDistrict.sampleAreas
    }
  }

  // 4. Postal Zone fallback (1-8)
  const zoneMap: Record<string, { city: string; state: string }> = {
    '1': { city: 'New Delhi', state: 'Delhi / NCR' },
    '2': { city: 'Lucknow', state: 'Uttar Pradesh' },
    '3': { city: 'Jaipur', state: 'Rajasthan' },
    '4': { city: 'Mumbai', state: 'Maharashtra' },
    '5': { city: 'Bengaluru (Bangalore)', state: 'Karnataka' },
    '6': { city: 'Chennai', state: 'Tamil Nadu' },
    '7': { city: 'Kolkata', state: 'West Bengal' },
    '8': { city: 'Patna', state: 'Bihar' }
  }
  const zone = zoneMap[cleanPin[0]] || { city: 'Mumbai', state: 'Maharashtra' }

  return {
    success: true,
    pincode: cleanPin,
    city: zone.city,
    district: zone.city,
    state: zone.state,
    areas: [zone.city, 'Central Area', 'Main Road']
  }
}
