// src/constants/legal.js
//
// Sursa unică de adevăr pentru documentele legale ale ModaGo.
// Acelasi continut alimenteaza si ecranele din aplicatie, si paginile HTML publice
// generate cu `node scripts/generate-legal-html.js` (necesare pentru Google Play).
//
// ⚠️ ATENTIE: aceste texte sunt o CIORNA scrisa pe baza modului real de functionare
// al aplicatiei. NU sunt consultanta juridica si NU au fost validate de un avocat.
// Dupa validare: completeaza LEGAL_ENTITY mai jos si pune LEGAL_DRAFT = false.

/** Cat timp e true, aplicatia afiseaza un banner ca documentele nu sunt finale. */
export const LEGAL_DRAFT = true;

/**
 * Datele entitatii juridice care opereaza ModaGo.
 * Trebuie completate inainte de lansare — apar in toate cele trei documente si
 * sunt obligatorii legal (comert electronic + protectia datelor).
 */
export const LEGAL_ENTITY = {
  name: "[DENUMIRE JURIDICĂ]",
  legalForm: "[SRL / PFA / Î.I.]",
  regNumber: "[NR. ÎNREGISTRARE / IDNO]",
  address: "[ADRESĂ SEDIU SOCIAL]",
  country: "[ȚARA]",
  email: "[EMAIL_CONTACT]",
  supportEmail: "[EMAIL_SUPORT]",
  phone: "[TELEFON]",
};

/** Regulile comerciale, tinute intr-un singur loc ca sa nu se contrazica intre documente. */
export const LEGAL_TERMS_DATA = {
  buyerFeePct: 5,
  buyerFeeFixedMdl: 2,
  autoReleaseDays: 14,
  minAge: 18,
  chargeCurrency: "RON",
  displayCurrency: "MDL",
};

const E = LEGAL_ENTITY;
const T = LEGAL_TERMS_DATA;

/* ────────────────────────────────────────────────────────────────────────────
   1. TERMENI ȘI CONDIȚII
   ──────────────────────────────────────────────────────────────────────────── */

const TERMS = {
  id: "terms",
  title: "Termeni și Condiții",
  shortTitle: "Termeni și Condiții",
  version: "1.0",
  updatedAt: "26 iulie 2026",
  intro:
    `Acești Termeni și Condiții („Termenii”) reglementează utilizarea aplicației mobile ` +
    `și a site-ului ModaGo („Platforma”), operate de ${E.name} ${E.legalForm}, ` +
    `${E.regNumber}, cu sediul în ${E.address}, ${E.country} („noi”, „ModaGo”). ` +
    `Prin crearea unui cont sau prin utilizarea Platformei, confirmi că ai citit, ai înțeles ` +
    `și accepți acești Termeni. Dacă nu ești de acord cu ei, te rugăm să nu utilizezi Platforma.`,
  sections: [
    {
      heading: "1. Definiții",
      bullets: [
        "„Platformă” — aplicația mobilă ModaGo, site-ul asociat și toate serviciile oferite prin acestea.",
        "„Utilizator” — orice persoană care își creează un cont pe Platformă.",
        "„Vânzător” — Utilizatorul care publică un articol spre vânzare.",
        "„Cumpărător” — Utilizatorul care achiziționează un articol.",
        "„Anunț” — oferta de vânzare publicată de un Vânzător, incluzând descriere, fotografii și preț.",
        "„Comandă” — tranzacția inițiată de un Cumpărător pentru un Anunț.",
        "„Escrow” — mecanismul prin care suma plătită de Cumpărător este reținută de procesatorul de plăți până la îndeplinirea condițiilor de eliberare descrise la art. 8.",
        "„Taxă de protecție” — comisionul suportat de Cumpărător, descris la art. 7.",
      ],
    },
    {
      heading: "2. Rolul ModaGo",
      body: [
        "ModaGo este o platformă de intermediere care permite persoanelor fizice să vândă și să cumpere articole vestimentare și accesorii second-hand sau noi. Contractul de vânzare-cumpărare se încheie exclusiv între Vânzător și Cumpărător.",
        "ModaGo NU este vânzător, nu deține articolele listate, nu le inspectează fizic și nu este parte în contractul de vânzare. Rolul nostru se limitează la punerea la dispoziție a Platformei, facilitarea plății prin escrow și oferirea unui mecanism de soluționare a disputelor conform art. 10.",
        "ModaGo nu garantează calitatea, autenticitatea, legalitatea sau conformitatea articolelor listate și nici capacitatea Vânzătorului de a vinde ori a Cumpărătorului de a plăti.",
      ],
    },
    {
      heading: "3. Eligibilitate și cont",
      body: [
        `Pentru a utiliza Platforma trebuie să ai cel puțin ${T.minAge} ani și capacitate deplină de exercițiu.`,
        "Îți poți crea un cont folosind o adresă de email și o parolă, sau prin autentificare cu Google ori Apple. Ești responsabil pentru păstrarea confidențialității datelor de acces și pentru toate activitățile desfășurate prin contul tău.",
        "Te obligi să furnizezi informații reale, complete și actualizate. Un Utilizator poate deține un singur cont, cu excepția cazului în care am aprobat expres altfel.",
        "Ne poți anunța imediat, la adresa indicată la art. 17, dacă suspectezi accesul neautorizat la contul tău.",
      ],
    },
    {
      heading: "4. Publicarea anunțurilor",
      body: [
        "În calitate de Vânzător, garantezi că ești proprietarul legitim al articolului listat, că ai dreptul să îl vinzi și că descrierea și fotografiile reflectă cu acuratețe starea reală a acestuia, inclusiv orice defecte, uzură sau modificări.",
        "Fotografiile trebuie să reprezinte articolul propriu-zis. Nu sunt permise imagini preluate din surse terțe ca reprezentare a articolului tău.",
        "Prețul afișat este stabilit liber de Vânzător și este exprimat în lei moldovenești (MDL).",
      ],
    },
    {
      heading: "5. Articole și conduită interzise",
      body: ["Este interzisă listarea sau comercializarea prin Platformă a următoarelor:"],
      bullets: [
        "Produse contrafăcute, replici sau articole care încalcă drepturi de proprietate intelectuală.",
        "Articole furate sau obținute ilegal.",
        "Lenjerie intimă purtată, articole nespălate sau în condiții neigienice.",
        "Arme, muniție, substanțe interzise, medicamente, produse periculoase.",
        "Articole din specii protejate sau materiale interzise prin lege.",
        "Orice bunuri sau servicii a căror comercializare este interzisă de legislația aplicabilă.",
      ],
      after: [
        "De asemenea, este interzis să: hărțuiești, amenințți sau discriminezi alți Utilizatori; transmiți conținut ilegal, obscen ori înșelător; încerci să finalizezi tranzacția în afara Platformei pentru a evita taxa de protecție și mecanismul de escrow; utilizezi Platforma în scop fraudulos; sau accesezi neautorizat sistemele noastre.",
        "Poți raporta orice anunț, mesaj sau Utilizator care încalcă aceste reguli, folosind funcția de raportare din aplicație. Poți de asemenea bloca un Utilizator, caz în care acesta nu îți va mai putea trimite mesaje.",
      ],
    },
    {
      heading: "6. Comanda și plata",
      body: [
        "Cumpărătorul inițiază o Comandă din pagina Anunțului. Plata se efectuează cu cardul, prin procesatorul nostru de plăți Stripe. ModaGo nu stochează și nu are acces la datele complete ale cardului tău.",
        `Prețurile sunt afișate în ${T.displayCurrency}. Întrucât procesatorul de plăți nu suportă ${T.displayCurrency} ca monedă de tranzacționare, suma este convertită și debitată în ${T.chargeCurrency} la cursul intern afișat în momentul plății. Banca ta poate aplica propriile comisioane de conversie valutară, asupra cărora ModaGo nu are control.`,
        "În momentul plății, articolul este rezervat pentru Cumpărător și devine indisponibil altor Utilizatori. Dacă plata nu este finalizată într-un interval rezonabil, rezervarea expiră automat și articolul redevine disponibil.",
      ],
    },
    {
      heading: "7. Taxa de protecție a Cumpărătorului",
      body: [
        `La fiecare Comandă, Cumpărătorul plătește o taxă de protecție de ${T.buyerFeePct}% din prețul articolului, plus ${T.buyerFeeFixedMdl} ${T.displayCurrency}. Taxa este afișată separat și explicit înainte de confirmarea plății.`,
        "Taxa acoperă utilizarea mecanismului de escrow, procesarea plății și accesul la procedura de soluționare a disputelor.",
        `Vânzătorul primește 100% din prețul articolului. ModaGo nu percepe comision Vânzătorului.`,
        "Taxa de protecție este rambursată integral Cumpărătorului în cazul în care Comanda este anulată sau rambursată integral în urma unei dispute soluționate în favoarea sa. În cazul rambursărilor parțiale, taxa nu se restituie.",
      ],
    },
    {
      heading: "8. Livrarea și eliberarea fondurilor",
      body: [
        "După confirmarea plății, Vânzătorul are obligația de a expedia articolul într-un termen rezonabil și de a introduce în aplicație numărul de urmărire (AWB) al coletului.",
        "Suma plătită de Cumpărător este reținută în escrow. Vânzătorul nu are acces la ea în acest interval.",
        `Fondurile sunt eliberate Vânzătorului în una dintre următoarele situații: (a) Cumpărătorul confirmă primirea și conformitatea articolului; sau (b) au trecut ${T.autoReleaseDays} zile de la marcarea Comenzii ca expediată, fără ca o dispută să fi fost deschisă.`,
        `Îți recomandăm să verifici articolul imediat ce îl primești. După expirarea termenului de ${T.autoReleaseDays} zile, fondurile sunt eliberate automat, iar posibilitatea de a deschide o dispută prin Platformă încetează.`,
        "Sumele eliberate sunt disponibile în secțiunea Balanță și pot fi retrase conform art. 9.",
      ],
    },
    {
      heading: "9. Retrageri",
      body: [
        "Vânzătorul poate solicita retragerea sumelor disponibile din secțiunea Balanță. Retragerile se procesează către contul bancar sau metoda de plată indicată de Vânzător.",
        "Ne rezervăm dreptul de a suspenda o retragere dacă există o dispută în curs, o suspiciune întemeiată de fraudă sau o obligație legală de a face acest lucru.",
        "Vânzătorul este singurul responsabil pentru declararea și plata oricăror taxe sau impozite datorate autorităților fiscale ca urmare a veniturilor obținute prin Platformă.",
      ],
    },
    {
      heading: "10. Dispute, retururi și rambursări",
      body: [
        `Dacă articolul primit nu corespunde descrierii, este deteriorat, contrafăcut sau nu a fost livrat, Cumpărătorul poate deschide o dispută din aplicație, atât timp cât Comanda are statusul „expediată” și fondurile nu au fost încă eliberate — adică în termenul de ${T.autoReleaseDays} zile prevăzut la art. 8.`,
        "Procedura completă, motivele acceptate, soluțiile posibile și termenele sunt descrise în Politica de Retur și Rambursare, care face parte integrantă din acești Termeni.",
        "ModaGo analizează dovezile prezentate de ambele părți și adoptă o decizie cu bună-credință. Această decizie privește exclusiv modul de distribuire a sumelor aflate în escrow și nu constituie o hotărâre judecătorească. Drepturile tale de a te adresa instanțelor competente sau autorităților de protecție a consumatorilor rămân neafectate.",
      ],
    },
    {
      heading: "11. Suspendarea și închiderea contului",
      body: [
        "Îți poți șterge contul oricând din aplicație. Ștergerea contului nu anulează obligațiile aferente Comenzilor aflate în derulare și nu afectează sumele reținute în escrow, care vor fi soluționate conform acestor Termeni.",
        "Putem suspenda sau închide un cont, cu sau fără notificare prealabilă, în cazul încălcării acestor Termeni, al suspiciunii de fraudă, al unor raportări repetate întemeiate din partea altor Utilizatori sau atunci când legea ne obligă.",
      ],
    },
    {
      heading: "12. Conținutul Utilizatorilor",
      body: [
        "Păstrezi toate drepturile asupra fotografiilor și textelor pe care le încarci. Prin publicarea lor, ne acorzi o licență neexclusivă, gratuită și limitată teritorial de a le afișa, stoca și reproduce exclusiv în scopul funcționării și promovării Platformei.",
        "Ești singurul responsabil pentru conținutul pe care îl publici și garantezi că deții drepturile necesare asupra acestuia.",
        "Putem elimina orice conținut care încalcă acești Termeni sau legislația aplicabilă.",
      ],
    },
    {
      heading: "13. Limitarea răspunderii",
      body: [
        "Platforma este pusă la dispoziție „ca atare”. Nu garantăm că va funcționa neîntrerupt sau fără erori.",
        "În limitele permise de lege, ModaGo nu răspunde pentru: calitatea, autenticitatea sau conformitatea articolelor tranzacționate; conduita Utilizatorilor; pierderile sau întârzierile cauzate de curieri; ori prejudiciile indirecte rezultate din utilizarea Platformei.",
        "Nicio prevedere din acești Termeni nu limitează răspunderea noastră în cazurile în care legea nu permite o astfel de limitare, inclusiv în caz de dol sau culpă gravă.",
      ],
    },
    {
      heading: "14. Protecția datelor",
      body: [
        "Prelucrarea datelor tale cu caracter personal este descrisă în Politica de Confidențialitate, disponibilă în aplicație și pe site.",
      ],
    },
    {
      heading: "15. Modificarea Termenilor",
      body: [
        "Putem actualiza acești Termeni. Versiunea actualizată se aplică de la data publicării în aplicație. În cazul unor modificări substanțiale, te vom notifica prin aplicație sau prin email cu un preaviz rezonabil.",
        "Continuarea utilizării Platformei după intrarea în vigoare a modificărilor reprezintă acceptarea acestora.",
      ],
    },
    {
      heading: "16. Legea aplicabilă și soluționarea litigiilor",
      body: [
        `Acești Termeni sunt guvernați de legislația din ${E.country}.`,
        "Te încurajăm să ne contactezi mai întâi pentru a soluționa amiabil orice neînțelegere. Dacă nu ajungem la un acord, litigiile vor fi soluționate de instanțele competente, fără a-ți afecta dreptul de a te adresa autorităților de protecție a consumatorilor.",
      ],
    },
    {
      heading: "17. Contact",
      body: [
        `Ne poți contacta la ${E.supportEmail} sau prin secțiunea de asistență din aplicație.`,
        `${E.name} ${E.legalForm} · ${E.regNumber} · ${E.address}, ${E.country}`,
      ],
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
   2. POLITICA DE CONFIDENȚIALITATE
   ──────────────────────────────────────────────────────────────────────────── */

const PRIVACY = {
  id: "privacy",
  title: "Politica de Confidențialitate",
  shortTitle: "Confidențialitate",
  version: "1.0",
  updatedAt: "26 iulie 2026",
  intro:
    `Această politică explică ce date cu caracter personal colectăm atunci când folosești ModaGo, ` +
    `de ce le colectăm, cu cine le partajăm și ce drepturi ai asupra lor. ` +
    `Operatorul datelor este ${E.name} ${E.legalForm}, ${E.regNumber}, cu sediul în ${E.address}, ${E.country}.`,
  sections: [
    {
      heading: "1. Ce date colectăm",
      body: ["Colectăm doar datele necesare pentru funcționarea Platformei:"],
      bullets: [
        "Date de cont: adresa de email, parola (stocată exclusiv sub formă de hash criptografic), numele afișat, fotografia de profil, dacă o adaugi.",
        "Date de autentificare socială: dacă te conectezi cu Google sau Apple, primim de la aceștia identificatorul contului, adresa de email și, după caz, numele. Nu primim parola ta.",
        "Date de anunț: fotografiile, descrierile, categoriile și prețurile articolelor pe care le publici.",
        "Date de tranzacție: comenzile, sumele, statusul plății, identificatorii de plată furnizați de procesator, istoricul escrow și retragerile.",
        "Adresa de livrare: numele destinatarului, adresa, localitatea și telefonul, necesare pentru expedierea coletelor.",
        "Comunicări: mesajele schimbate cu alți Utilizatori prin chat, mesajele și dovezile încărcate în cadrul disputelor, raportările pe care le trimiți.",
        "Date tehnice: identificatorul dispozitivului, tokenul pentru notificări push, informații despre versiunea aplicației și jurnale tehnice de eroare.",
      ],
      after: [
        "NU colectăm și NU avem acces la numărul complet al cardului tău bancar, la codul CVV sau la datele de autentificare bancară. Acestea sunt procesate direct de Stripe.",
      ],
    },
    {
      heading: "2. De ce prelucrăm aceste date",
      bullets: [
        "Executarea contractului: crearea contului, publicarea anunțurilor, procesarea comenzilor și plăților, livrarea, gestionarea disputelor și a retragerilor.",
        "Obligații legale: păstrarea evidențelor financiare și contabile, răspunsul la solicitările autorităților competente.",
        "Interes legitim: prevenirea fraudei și a abuzurilor, moderarea conținutului raportat, securizarea Platformei, îmbunătățirea funcționalităților.",
        "Consimțământ: trimiterea notificărilor push, pe care le poți dezactiva oricând din Setări sau din setările sistemului de operare.",
      ],
    },
    {
      heading: "3. Cu cine partajăm datele",
      body: [
        "Nu vindem datele tale personale. Le partajăm doar cu furnizorii necesari funcționării serviciului și doar în măsura strict necesară:",
      ],
      bullets: [
        "Cu ceilalți Utilizatori: numele afișat, fotografia de profil și anunțurile tale sunt publice. Adresa de livrare este comunicată exclusiv Vânzătorului de la care ai cumpărat, pentru expedierea coletului.",
        "Supabase — găzduirea bazei de date, autentificarea și stocarea fișierelor.",
        "Stripe — procesarea plăților, escrow și rambursări. Stripe operează ca operator independent pentru datele de plată, conform propriei politici de confidențialitate.",
        "Expo — livrarea notificărilor push către dispozitivul tău.",
        "Google și Apple — doar dacă alegi autentificarea prin aceste servicii.",
        "Curieri și servicii de livrare — datele de expediere necesare pentru transportul coletului.",
        "Autorități publice — atunci când legea ne obligă.",
      ],
    },
    {
      heading: "4. Transferuri internaționale",
      body: [
        "Furnizorii noștri de infrastructură pot stoca și prelucra date pe servere situate în Uniunea Europeană sau în alte state. În aceste cazuri, transferul se realizează pe baza garanțiilor prevăzute de legislația aplicabilă privind protecția datelor, cum ar fi clauzele contractuale standard.",
      ],
    },
    {
      heading: "5. Cât timp păstrăm datele",
      bullets: [
        "Datele de cont: pe durata existenței contului.",
        "Datele de tranzacție și evidențele financiare: pe perioada impusă de legislația fiscală și contabilă aplicabilă, chiar și după ștergerea contului.",
        "Mesajele și dovezile din dispute: pe durata necesară soluționării și pentru o perioadă rezonabilă ulterioară, în scop probatoriu.",
        "Raportările de conținut: pe durata necesară gestionării abuzurilor și prevenirii repetării acestora.",
        "Jurnalele tehnice: o perioadă limitată, necesară diagnosticării problemelor.",
      ],
    },
    {
      heading: "6. Drepturile tale",
      body: ["În raport cu datele tale personale, ai următoarele drepturi:"],
      bullets: [
        "Dreptul de acces — să afli ce date deținem despre tine.",
        "Dreptul la rectificare — să corectezi datele inexacte, direct din aplicație sau prin solicitare.",
        "Dreptul la ștergere — să ceri eliminarea datelor, în limitele obligațiilor noastre legale de păstrare.",
        "Dreptul la restricționarea prelucrării și dreptul la opoziție.",
        "Dreptul la portabilitate — să primești datele într-un format structurat.",
        "Dreptul de a-ți retrage consimțământul, acolo unde prelucrarea se bazează pe acesta.",
        "Dreptul de a depune o plângere la autoritatea competentă pentru protecția datelor cu caracter personal.",
      ],
      after: [
        `Îți poți exercita aceste drepturi scriindu-ne la ${E.email}. Vom răspunde în termenul prevăzut de lege.`,
      ],
    },
    {
      heading: "7. Ștergerea contului",
      body: [
        "Îți poți șterge contul direct din aplicație. La ștergere, eliminăm datele de profil, anunțurile active și tokenul de notificări.",
        "Păstrăm însă datele aferente tranzacțiilor finalizate și disputelor, în măsura în care legislația fiscală, contabilă sau soluționarea unor eventuale litigii ne obligă. Aceste date sunt separate de profilul tău și nu mai sunt utilizate în scopuri operaționale.",
        "Comenzile aflate în derulare trebuie finalizate înainte de ștergerea contului.",
      ],
    },
    {
      heading: "8. Securitate",
      body: [
        "Aplicăm măsuri tehnice și organizatorice pentru protejarea datelor: comunicație criptată, parole stocate exclusiv sub formă de hash, reguli de acces la nivel de rând în baza de date, astfel încât fiecare Utilizator să poată accesa doar propriile date, și verificarea criptografică a notificărilor primite de la procesatorul de plăți.",
        "Niciun sistem nu este însă complet invulnerabil. Te rugăm să folosești o parolă unică și puternică și să ne anunți imediat dacă suspectezi un acces neautorizat.",
      ],
    },
    {
      heading: "9. Minori",
      body: [
        `Platforma nu se adresează persoanelor sub ${T.minAge} ani și nu colectăm cu bună știință date de la acestea. Dacă afli că un minor și-a creat cont, te rugăm să ne contactezi pentru a-l elimina.`,
      ],
    },
    {
      heading: "10. Modificări ale politicii",
      body: [
        "Putem actualiza această politică. Versiunea în vigoare este întotdeauna cea publicată în aplicație, împreună cu data ultimei actualizări. Modificările substanțiale îți vor fi comunicate prin aplicație sau email.",
      ],
    },
    {
      heading: "11. Contact",
      body: [
        `Pentru orice întrebare privind datele tale personale: ${E.email}.`,
        `${E.name} ${E.legalForm} · ${E.regNumber} · ${E.address}, ${E.country}`,
      ],
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
   3. POLITICA DE RETUR ȘI RAMBURSARE
   ──────────────────────────────────────────────────────────────────────────── */

const RETURNS = {
  id: "returns",
  title: "Politica de Retur și Rambursare",
  shortTitle: "Retur și rambursare",
  version: "1.0",
  updatedAt: "26 iulie 2026",
  intro:
    `Această politică explică în ce situații poți obține banii înapoi, cum se deschide o dispută ` +
    `și cum se derulează un retur. Face parte integrantă din Termenii și Condițiile ModaGo.`,
  sections: [
    {
      heading: "1. Principiul de bază",
      body: [
        `Banii plătiți de Cumpărător nu ajung imediat la Vânzător. Ei sunt reținuți în escrow și eliberați doar după ce Cumpărătorul confirmă primirea articolului sau după ${T.autoReleaseDays} zile de la expediere, dacă nu s-a deschis nicio dispută.`,
        "Acest mecanism îți oferă timp să verifici articolul înainte ca Vânzătorul să încaseze suma.",
      ],
    },
    {
      heading: "2. Când poți deschide o dispută",
      body: [
        `O dispută poate fi deschisă de Cumpărător cât timp Comanda are statusul „expediată” și fondurile nu au fost încă eliberate — practic, în intervalul de ${T.autoReleaseDays} zile de la marcarea expedierii.`,
        `⚠️ Important: după eliberarea automată a fondurilor, la expirarea celor ${T.autoReleaseDays} zile, disputa nu mai poate fi deschisă prin Platformă. Verifică articolul imediat ce îl primești.`,
      ],
    },
    {
      heading: "3. Motive întemeiate pentru dispută",
      bullets: [
        "Articolul nu a fost livrat deloc.",
        "Articolul primit diferă semnificativ de descrierea sau de fotografiile din anunț (alt model, altă culoare, altă mărime).",
        "Articolul prezintă defecte, deteriorări sau urme de uzură care nu au fost menționate în anunț.",
        "Articolul este contrafăcut.",
        "Ai primit alt articol decât cel comandat.",
      ],
      after: [
        "Nu constituie motive întemeiate: simpla schimbare a deciziei, faptul că articolul nu ți se potrivește ca mărime deși mărimea corespundea descrierii, sau diferențele minore de nuanță cauzate de afișajul ecranului.",
      ],
    },
    {
      heading: "4. Cum se desfășoară procedura",
      bullets: [
        "Deschizi disputa din ecranul comenzii și descrii problema.",
        "Încarci dovezi: fotografii clare ale articolului primit, ale ambalajului și ale eventualelor defecte.",
        "Vânzătorul este notificat și poate răspunde, poate prezenta propriile dovezi sau poate propune o soluție amiabilă, cum ar fi o rambursare parțială.",
        "Dacă părțile ajung la un acord, acesta se aplică imediat.",
        "Dacă nu, echipa ModaGo analizează dovezile ambelor părți și decide.",
      ],
      after: [
        "Pe toată durata disputei, fondurile rămân blocate în escrow. Nici Vânzătorul, nici Cumpărătorul nu au acces la ele.",
      ],
    },
    {
      heading: "5. Soluțiile posibile",
      bullets: [
        `Rambursare integrală — Cumpărătorul primește înapoi prețul articolului ȘI taxa de protecție de ${T.buyerFeePct}% + ${T.buyerFeeFixedMdl} ${T.displayCurrency}. Se aplică atunci când articolul nu a fost livrat, este contrafăcut ori diferă esențial de descriere.`,
        "Rambursare parțială — Cumpărătorul păstrează articolul și primește înapoi o parte din preț, ca formă de compensare. Taxa de protecție nu se restituie în acest caz.",
        "Retur cu rambursare — Cumpărătorul returnează articolul Vânzătorului, iar după confirmarea primirii se efectuează rambursarea.",
        "Respingerea disputei — dacă dovezile nu susțin reclamația, fondurile sunt eliberate Vânzătorului.",
      ],
    },
    {
      heading: "6. Costul returului",
      body: [
        "Atunci când disputa este soluționată în favoarea Cumpărătorului și se decide returnarea articolului, costul transportului de retur este suportat de Vânzător.",
        "Cumpărătorul expediază coletul, introduce în aplicație numărul de urmărire și costul efectiv al transportului, dovedit prin documentul emis de curier.",
        "Din motive tehnice legate de procesatorul de plăți, contravaloarea transportului de retur poate fi restituită separat de rambursarea principală. Te vom informa asupra modalității și termenului.",
        "Dacă disputa este respinsă, eventualele costuri de transport rămân în sarcina Cumpărătorului.",
      ],
    },
    {
      heading: "7. Termene de rambursare",
      body: [
        "Rambursarea este inițiată imediat după soluționarea disputei.",
        "Suma este returnată pe același card cu care s-a efectuat plata. Perioada până la apariția banilor în cont depinde de banca emitentă și este, în general, de 5–10 zile lucrătoare.",
        `Rambursarea se efectuează în ${T.chargeCurrency}, moneda în care a fost procesată plata inițială. Din cauza fluctuațiilor cursului valutar, suma percepută de bancă în altă monedă poate diferi ușor de cea inițială. Această diferență nu depinde de ModaGo.`,
      ],
    },
    {
      heading: "8. Anularea înainte de expediere",
      body: [
        "Dacă Vânzătorul nu expediază articolul într-un termen rezonabil, sau dacă ambele părți convin anularea, Comanda poate fi anulată, iar Cumpărătorul primește rambursarea integrală, incluzând taxa de protecție.",
      ],
    },
    {
      heading: "9. Utilizarea abuzivă",
      body: [
        "Deschiderea repetată de dispute nefondate, prezentarea de dovezi false sau returnarea unui alt articol decât cel primit constituie încălcări ale Termenilor și pot duce la suspendarea contului, fără a exclude alte măsuri legale.",
      ],
    },
    {
      heading: "10. Drepturile tale legale",
      body: [
        "Majoritatea tranzacțiilor de pe ModaGo se desfășoară între persoane fizice, situație în care legislația privind protecția consumatorilor în raporturile cu comercianții profesioniști poate să nu se aplice.",
        "Dacă însă achiziționezi de la un Utilizator care acționează ca profesionist, drepturile tale legale de consumator, inclusiv eventualul drept de retragere, rămân neafectate de prezenta politică.",
      ],
    },
    {
      heading: "11. Contact",
      body: [
        `Pentru orice întrebare legată de o dispută sau o rambursare: ${E.supportEmail}.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = {
  terms: TERMS,
  privacy: PRIVACY,
  returns: RETURNS,
};

export const LEGAL_DOCUMENT_LIST = [TERMS, PRIVACY, RETURNS];

export function getLegalDocument(id) {
  return LEGAL_DOCUMENTS[id] || null;
}
