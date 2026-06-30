import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertTriangle, Mail, Database } from 'lucide-react';

export default function Methodology({ darkMode }) {
  const navigate = useNavigate();
  const Section = ({ icon, title, children }) => (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
      <h2 className="font-semibold flex items-center gap-2 mb-3">{icon}{title}</h2>
      <div className={`text-sm leading-relaxed space-y-3 ${darkMode?'text-gray-300':'text-gray-700'}`}>{children}</div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={()=>navigate('/')} aria-label="Vissza a dashboardra"
            className={`p-2 rounded-lg transition ${darkMode?'bg-gray-800 hover:bg-gray-700':'bg-white hover:bg-gray-100 border border-gray-200'}`}>
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <p className="text-sm opacity-50">NER Tracker</p>
            <h1 className="text-2xl font-bold">Módszertan és helyesbítés</h1>
          </div>
        </div>

        <Section icon={<Database className="w-4 h-4 text-blue-400"/>} title="Hogyan kerülnek be az ügyek">
          <p>
            Az oldalon megjelenő ügyek két forrásból származnak: egy automatizált
            RSS-scraper naponta gyűjti a magyarországi hírportálok (Telex, HVG, 444,
            Direkt36, Átlátszó, Abcúg, G7, Magyar Narancs, Mérce, Partizán, Szabad
            Európa) nyilvánosan elérhető cikkeit, valamint kézzel felvett, jól
            dokumentált történeti ügyek egészítik ki az adatbázist.
          </p>
          <p>
            A scraper csak olyan cikkeket vesz fel, amelyek egyszerre tartalmaznak
            konkrét NER-közeli személyt/intézményt jelző kulcsszót ÉS korrupciós
            indikátort (pl. "nyomozás", "vesztegetés", "közbeszerzés"). Ez a kettős
            szűrés csökkenti, de nem zárja ki teljesen a téves találatokat.
          </p>
        </Section>

        <Section icon={<AlertTriangle className="w-4 h-4 text-yellow-400"/>} title="Korlátok és bizonytalanságok">
          <p>
            Az automatikusan felvett ügyek <strong>RSS-összefoglalók alapján</strong>{' '}
            készülnek, nem eredeti tényfeltáró kutatásból — az oldal a már
            megjelent sajtóhírekre mutat, nem azok helyébe lép. A <code>verified: false</code>{' '}
            jelzésű (⚠️ ikonnal jelölt) ügyek automatikusan kerültek be és még nem
            estek át kézi ellenőrzésen; a ✅ jelzésűek emberi felülvizsgálaton
            mentek keresztül.
          </p>
          <p>
            Az érintett személyek azonosítása részben automatikus szövegfelismeréssel
            történik, ami tévedhet — különösen, ha egy cikkben egy névvel azonos nevű,
            de más, az ügyhöz nem köthető személy szerepel. A "Nyomozás alatt" vagy
            "Aktív" státusz nem jelenti a bűnösség megállapítását; az oldal az
            ártatlanság vélelmét tiszteletben tartva kizárólag a nyilvános sajtóhírek
            tartalmát tükrözi, nem saját megállapítást fogalmaz meg.
          </p>
          <p>
            Az összegek (<code>amount_huf</code>) a cikkekben szereplő, gyakran becsült
            vagy vitatott számok — ha egy ügynél nem ismert pontos összeg, az oldal
            "Összeg ismeretlen"-t mutat, sosem becsült placeholder-t.
          </p>
        </Section>

        <Section icon={<Mail className="w-4 h-4 text-purple-400"/>} title="Helyesbítés kérése">
          <p>
            Ha úgy találod, hogy egy ügy téves, félrevezető, elavult, vagy tévesen
            köt össze egy személyt egy ügyhöz, kérjük jelezd a repo Issues
            funkcióján keresztül:{' '}
            <a href="https://github.com/Szolke/ner-tracker/issues/new"
              target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:underline">github.com/Szolke/ner-tracker/issues</a>.
          </p>
          <p>
            A helyesbítési kérésekben kérjük tüntesd fel az ügy azonosítóját (az URL
            <code> ?case=...</code> paramétere), a kifogásolt részt, és lehetőség
            szerint egy hivatkozást a helyes információra. A jogos helyesbítési
            kéréseket az adatbázis-karbantartó a lehető leghamarabb átvezeti.
          </p>
        </Section>

        <p className="text-xs opacity-40 text-center pt-2">
          Ez az oldal nem helyettesíti a jogi vagy újságírói szakvéleményt, és nem
          minősül hivatalos hatósági megállapításnak.
        </p>
      </div>
    </div>
  );
}
