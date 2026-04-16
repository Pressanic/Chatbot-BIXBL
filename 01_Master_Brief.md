# BIXBG Chatbot Agent - Master Brief

> **Cos'è questo documento:** Il brief completo del progetto. Contiene tutto quello che serve per capire cosa stiamo costruendo, per chi, con quale tecnologia, e quali sono i confini. Ogni sistema AI coinvolto nel progetto deve leggere questo documento come primo contesto prima di fare qualsiasi cosa.

---

## 1. Obiettivo del Progetto

Costruire un chatbot web per **Belle idee x Bella gente (BIXBG)**, un progetto che organizza esperienze itineranti per sconosciuti, con l'obiettivo di generare connessioni autentiche, sensibilizzare su temi sociali e culturali reali, e produrre impatto locale misurabile.

Il chatbot è uno strumento **ad uso interno** del fondatore (Matteo). Permette di qualificare le idee di esperienza, strutturarle creativamente e identificare i partner e sponsor più adatti da approcciare.

Il sistema è composto da 4 agenti AI:

- **Manager Agent** — legge la conversazione, capisce l'intento, e attiva autonomamente l'agente corretto
- **BIXBG Compass** — agente principale: qualifica l'idea di esperienza (partecipanti target, bisogno, tipo di esperienza), raccoglie tutte le informazioni necessarie per alimentare gli altri due agenti
- **BIXBG Architect** — agente creativo: prende il profilo dall'esperienza qualificata e costruisce la struttura narrativa e operativa dell'evento (tema, luogo, attività, filo conduttore)
- **BIXBG Bridge** — agente tecnico: prende l'esperienza strutturata e costruisce il profilo dei partner/sponsor ideali + il pitch per contattarli

L'interfaccia web mostra chiaramente quale agente sta parlando in ogni momento, cambiando nome e colore nell'UI.

---

## 2. Stack Tecnologico

- **Framework:** Next.js (App Router)
- **Frontend:** React con Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **LLM:** Claude API (Anthropic). Ogni studente deve dichiarare all'inizio quale API usa tra: Claude API, Gemini API (Google), o GPT API (OpenAI).
- **Deploy:** Vercel (Git-based deployment)
- **IDE:** Google AntiGravity (AI-assisted IDE)
- **Version Control:** Git

---

## 3. Architettura di Massima

```
┌─────────────────────────────────┐
│         FRONTEND (React)         │
│  Chat UI con indicatore agente   │
│  Nome + colore cambiano per      │
│  agente attivo                   │
└──────────────┬──────────────────┘
               │ POST /api/chat
               ▼
┌─────────────────────────────────┐
│      API ROUTE (Next.js)         │
│                                  │
│  1. Riceve messaggio + history   │
│  2. MANAGER classifica intent    │
│     → JSON: { agent: "architect"}│
│  3. Carica system prompt +       │
│     KB dell'agente selezionato   │
│  4. AGENTE genera risposta       │
│  5. Ritorna: { agent, message,   │
│     color }                      │
└──────────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│COMPASS │ │ARCHITECT│ │BRIDGE  │
│ Prompt │ │ Prompt │ │ Prompt │
│  + KB  │ │  + KB  │ │  + KB  │
└────────┘ └────────┘ └────────┘
               │
         ┌─────┘
         ▼
┌─────────────────────────────────┐
│     KNOWLEDGE BASE (file .md)    │
│  Shared KB + 3 Vertical KBs     │
│  Letti a runtime dal server      │
│  Iniettati nel contesto LLM      │
└─────────────────────────────────┘
```

**Flusso per ogni messaggio:**

1. Il frontend invia il messaggio + intera cronologia + agente attualmente attivo
2. Il backend chiama il Manager (LLM call leggera, JSON mode) che decide quale agente deve rispondere
3. Il backend carica il system prompt e la KB dell'agente selezionato
4. Il backend chiama l'agente selezionato (LLM call completa, con streaming) passandogli cronologia e contesto
5. La risposta viene restituita al frontend con il nome e il colore dell'agente

---

## 4. Vincoli

- **Tempo:** Il progetto deve essere costruito in circa 4 ore durante una lezione universitaria
- **Competenze:** Gli studenti hanno esperienza media nello sviluppo. Hanno completato Lezione 1 (prompting) e Lezione 2 (costruzione assistenti con KB)
- **Nessun database:** La memoria della conversazione vive nello stato React del frontend (session-based). Se l'utente ricarica la pagina, la conversazione riparte da zero
- **Knowledge Base statica:** I file .md vengono letti dal filesystem del server a runtime. Non c'è RAG, non ci sono embeddings, non c'è vector store
- **API key:** Ogni studente usa la propria API key, configurata in `.env.local`

---

## 5. Definizione di "Finito"

Il progetto è completo quando:

- L'utente apre la pagina web e vede un chatbot con un messaggio di benvenuto da BIXBG Compass
- L'utente può scrivere messaggi e ricevere risposte in streaming
- Il nome e il colore dell'agente attivo cambiano automaticamente nell'UI in base al contesto
- Compass qualifica l'idea di esperienza raccogliendo profilo partecipanti, tema, luogo e obiettivo
- Architect struttura l'esperienza con tema narrativo, attività, filo conduttore e formato operativo
- Bridge produce il profilo dei partner ideali e un pitch testuale per contattarli
- Il chatbot è deployato su Vercel e accessibile tramite URL pubblico

---

## 6. Anti-Goal

- **Non ci serve autenticazione utente.** Il chatbot è ad uso interno, nessun account o login.
- **Non ci serve un database.** Nessun dato viene persistito tra sessioni.
- **Non stiamo costruendo uno strumento per i partecipanti finali.** Il chatbot serve al fondatore, non al pubblico.
- **Non ci serve un pannello admin.** Nessuna dashboard, nessuna interfaccia di configurazione.
- **Non ci serve un sistema di pagamento.** Il chatbot non processa transazioni.
- **Non ci serve analytics o tracking.** Nessun sistema di monitoraggio.
- **Non ci serve il test automatizzato.** La validazione è manuale.
- **Non stiamo ottimizzando per SEO, performance, o accessibilità avanzata.** È un MVP funzionale per validazione didattica.

---

## Contesto Didattico

Questo progetto è la **Lezione 3** del modulo "Technology for Entrepreneurs" presso H-Farm College (BSc Level 5, 20 crediti). Il caso studio attraversa tutte e tre le lezioni con complessità crescente:

- **Lezione 1:** Fondamenti di prompting e task decomposition
- **Lezione 2:** Costruzione manuale di assistenti AI — Knowledge Base condivisa, KB verticali, system prompt STARS, test e meta-prompt
- **Lezione 3 (questa):** Deploy di un sistema multi-agente funzionante come web chatbot, usando un IDE AI-assisted (AntiGravity) con il metodo Plan and Solve

---

## Identità Visiva degli Agenti

| Agente | Nome UI | Colore |
|--------|---------|--------|
| Compass | BIXBG Compass | `#6475FA` (viola) |
| Architect | BIXBG Architect | `#E8650A` (arancio) |
| Bridge | BIXBG Bridge | `#22C55E` (verde) |
