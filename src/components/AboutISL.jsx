import './AboutISL.css';

const ISL_PHRASES = [
  { gloss: 'NAME YOU WHAT', en: 'What is your name?', note: 'Topic-comment structure with raised eyebrows' },
  { gloss: 'HAPPY ME', en: 'I am happy', note: 'Adjective before pronoun — ISL often places the descriptor first' },
  { gloss: 'DEAF ME', en: 'I am Deaf', note: 'Identity-first construction common in Deaf culture' },
  { gloss: 'TEA WANT YOU', en: 'Do you want tea?', note: 'Object-verb-subject with questioning facial expression' },
  { gloss: 'THANK-YOU IX-you', en: 'Thank you (directed at someone)', note: 'IX = index point — ISL uses pointing for pronouns and spatial grammar' },
];

export default function AboutISL({ onBack }) {
  return (
    <div className="about-isl radial-bg">
      <div className="about-isl-content">
        <button className="btn btn-small about-isl-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="about-isl-title">Faoin ISL</h1>
        <p className="about-isl-subtitle">About Irish Sign Language</p>

        <div className="about-isl-divider" />

        {/* ── ISL is its own language ──────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">ISL is a Language</h2>
          <p>
            Irish Sign Language (ISL) is the native language of the Deaf community in Ireland.
            It is not a signed version of English, nor is it signed Irish (Gaeilge). ISL has its own
            grammar, syntax, and vocabulary that developed independently over centuries within
            Irish Deaf communities.
          </p>
          <p>
            ISL was officially recognised by the Irish government as a native language of Ireland
            in the <strong>Irish Sign Language Act 2017</strong>. This recognition was the result
            of decades of advocacy by the Irish Deaf community and affirmed what Deaf people
            had always known: ISL is a complete, living language.
          </p>
        </section>

        {/* ── ISL is distinct ─────────────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">ISL is Not BSL, Not ASL, Not L&aacute;mh</h2>
          <p>
            ISL is distinct from British Sign Language (BSL), though there is some overlap due
            to historical contact. ISL has deeper connections to French Sign Language (LSF) —
            a legacy of French Deaf educators who worked in Irish schools in the 19th century.
          </p>
          <p>
            <strong>ISL is not L&aacute;mh.</strong> L&aacute;mh is a key-word signing support
            system used alongside speech for people with communication needs. It borrows some
            signs from ISL but is not a language — it has no grammar or syntax of its own.
            Conflating ISL with L&aacute;mh is a common and harmful misconception that
            diminishes ISL&rsquo;s status as a full natural language.
          </p>
        </section>

        {/* ── ISL Grammar ─────────────────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">ISL Grammar — A Different Way of Thinking</h2>
          <p>
            ISL has its own word order and grammatical structures that differ fundamentally
            from English. Understanding ISL gloss notation helps learners appreciate this.
            Gloss is a written convention where signs are represented in capital letters in
            ISL word order:
          </p>
          <div className="about-gloss-examples">
            {ISL_PHRASES.map((p, i) => (
              <div className="about-gloss-row" key={i}>
                <span className="about-gloss-isl">{p.gloss}</span>
                <span className="about-gloss-en">&rarr; &ldquo;{p.en}&rdquo;</span>
                <span className="about-gloss-note">{p.note}</span>
              </div>
            ))}
          </div>
          <p>
            Non-manual markers — facial expressions, eyebrow position, mouth patterns, head
            movements — carry grammatical meaning in ISL. A raised eyebrow can turn a statement
            into a question. A head tilt can indicate a conditional. The face is not just
            expression — it is grammar.
          </p>
        </section>

        {/* ── Regional variation ──────────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">Regional Variation</h2>
          <p>
            Like any living language, ISL varies by region. Signs can differ between Dublin,
            Cork, Galway, and other areas — just as spoken Irish has its Munster, Connacht,
            and Ulster dialects. Historical differences between signs used in boys&rsquo; and
            girls&rsquo; schools have also left their mark on the language.
          </p>
        </section>

        {/* ── Deaf culture ────────────────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">Irish Deaf Community &amp; Culture</h2>
          <p>
            The Irish Deaf community has a rich cultural heritage. Key institutions include
            St. Mary&rsquo;s School for Deaf Girls, the Catholic Institute for Deaf Boys,
            and organisations like the <strong>Irish Deaf Society</strong> and
            <strong> Deaf Village Ireland</strong> (Cabra, Dublin). These places are not just
            schools and offices — they are cultural centres where ISL thrives and Deaf identity
            is strengthened.
          </p>
          <p>
            &ldquo;Deaf&rdquo; with a capital D refers to cultural and linguistic identity —
            belonging to the Deaf community and using sign language as a primary language.
            This is distinct from &ldquo;deaf&rdquo; (lowercase) as a medical description
            of hearing status.
          </p>
        </section>

        {/* ── Etiquette ──────────────────────────────────── */}
        <section className="about-section">
          <h2 className="about-heading">Deaf Cultural Etiquette</h2>
          <ul className="about-etiquette">
            <li>
              <strong>Maintain eye contact</strong> when communicating with a Deaf person.
              Looking away while someone is signing is equivalent to covering your ears
              during a conversation.
            </li>
            <li>
              <strong>Get attention appropriately</strong> — wave in their line of sight or
              tap them gently on the shoulder. Never grab or startle.
            </li>
            <li>
              <strong>Don&rsquo;t cover your mouth</strong> when near a Deaf person. Many
              use lipreading as a supplement, and facial expressions carry grammatical meaning
              in ISL.
            </li>
            <li>
              <strong>This app is a starting point, not a substitute.</strong> The best way
              to learn ISL is from Deaf ISL users. Seek out classes, community events, and
              Deaf-led resources.
            </li>
          </ul>
        </section>

        <div className="about-isl-divider" />

        <p className="about-footer">
          <em>
            &ldquo;Beatha teanga &iacute; a labhairt&rdquo; — The life of a language is to speak it.
            <br />
            The life of ISL is to sign it. Learn from the community. Respect the language.
          </em>
        </p>

        <button className="btn btn-small" onClick={onBack} style={{ marginTop: 12 }}>
          &larr; Ar Ais
        </button>
      </div>
    </div>
  );
}
