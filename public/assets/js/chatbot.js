(function () {
    const CHATBOT_ICON = 'assets/img/icono-chatbot.png';
    let chatForm = null;
    let chatInput = null;
    let chatMessages = null;
    let activeTypingIndicator = null;
    let activeTypingInterval = null;

    const chatKnowledge = {
        loaded: false,
        items: []
    };

    const chatState = {
        awaitingFollowUp: false,
        awaitingRating: false,
        conversationContext: {
            lastTopic: null,
            lastIntent: null,
            awaitingAnswer: null
        }
    };

    const conversationalIntents = {
        greetings: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "que tal"],
        farewells: ["adios", "hasta luego", "nos vemos", "chao", "bye", "hasta otra"],
        thanks: ["gracias", "muchas gracias", "gracias por la ayuda", "perfecto gracias", "ok gracias", "vale gracias", "mil gracias"],
        endConversation: ["no", "no gracias", "nada mas", "por ahora no", "eso es todo", "no tengo mas dudas"],
        positiveRating: ["si", "claro", "me ha servido", "ha sido util", "perfecto"],
        negativeRating: ["no", "no me ha servido", "no era lo que buscaba", "no me ayudo", "sigo con dudas"]
    };

    const intentDefinitions = [
        {
            intent: 'courses',
            topic: 'cursos',
            answer: "En WoWacademy puedes consultar cursos de Desarrollo Web, Diseño & UX, Marketing Digital, Inteligencia Artificial, Negocios, Data Science, Ciberseguridad y Edición de Vídeo. ¿Sobre qué área te interesa saber más?",
            patterns: ["curso", "cursos", "formacion", "catalogo", "aprender", "estudiar", "clase", "programa", "temario"]
        },
        {
            intent: 'prices',
            topic: 'precios',
            answer: "Para revisar precios, tarifas o mensualidades, lo mejor es consultar la información actual del curso que te interesa o contactar con soporte para una orientación personalizada.",
            patterns: ["precio", "precios", "cuanto cuesta", "coste", "tarifa", "cuanto vale", "importe", "mensualidad", "pago", "cuota"]
        },
        {
            intent: 'certificates',
            topic: 'certificados',
            answer: "WoWacademy presenta formación práctica con certificación. Al completar el aprendizaje indicado por la plataforma, puedes obtener un certificado o diploma asociado al curso.",
            patterns: ["certificado", "certificados", "diploma", "acreditacion", "titulacion", "justificante", "certificacion"]
        },
        {
            intent: 'registration',
            topic: 'registro',
            answer: "Puedes registrarte desde el botón Únete gratis o Empieza gratis hoy. El formulario pide nombre, email, contraseña y aceptar los términos.",
            patterns: ["registro", "registrarme", "crear cuenta", "alta", "unirme", "apuntarme", "inscribirme", "matricularme"]
        },
        {
            intent: 'access',
            topic: 'acceso',
            answer: "Para acceder, pulsa Entrar en la parte superior e introduce tu email y contraseña. Si eres alumno entrarás en tu área y si eres admin irás al panel de administración.",
            patterns: ["acceso", "acceder", "entrar", "login", "iniciar sesion", "sesion", "cuenta", "contrasena", "password"]
        },
        {
            intent: 'support',
            topic: 'soporte',
            answer: "Si necesitas ayuda personalizada, puedes contactar con soporte desde las opciones de contacto de la plataforma. También puedes reformular tu duda aquí y trataré de orientarte.",
            patterns: ["soporte", "ayuda", "contacto", "contactar", "problema", "incidencia", "error", "no funciona", "atencion"]
        },
        {
            intent: 'recommendation',
            topic: 'recomendacion',
            answer: "Puedo ayudarte a elegir. ¿Qué te interesa más?",
            patterns: ["recomienda", "recomendacion", "no se que estudiar", "que estudiar", "orientame", "aconsejame", "elegir curso", "mejor curso"],
            options: [
                { question: "Programación", answer: "Si te interesa Programación, te recomiendo empezar por Desarrollo Web para crear páginas, aplicaciones y proyectos reales desde una base práctica.", topic: "desarrollo web" },
                { question: "Diseño", answer: "Si te interesa Diseño, el área de Diseño & UX encaja bien para aprender experiencia de usuario, interfaz y creación visual aplicada a productos digitales.", topic: "diseno ux" },
                { question: "Marketing", answer: "Si te interesa Marketing, Marketing Digital puede ayudarte a trabajar campañas, contenidos, captación y crecimiento online.", topic: "marketing digital" },
                { question: "Inteligencia Artificial", answer: "Si te interesa la Inteligencia Artificial, puedes orientarte a automatización, herramientas IA y creación de soluciones modernas.", topic: "inteligencia artificial" },
                { question: "Ciberseguridad", answer: "Si te interesa Ciberseguridad, es una buena opción para aprender protección, prevención de riesgos y seguridad en entornos digitales.", topic: "ciberseguridad" },
                { question: "Negocios", answer: "Si te interesan los Negocios, puedes enfocarte en estrategia, gestión y habilidades digitales para impulsar proyectos.", topic: "negocios" },
                { question: "Data Science", answer: "Si te interesa Data Science, puedes aprender análisis de datos, interpretación y toma de decisiones basada en información.", topic: "data science" },
                { question: "Edición de Vídeo", answer: "Si te interesa Edición de Vídeo, es ideal para crear contenido audiovisual profesional para redes, marcas o proyectos propios.", topic: "edicion de video" }
            ]
        },
        {
            intent: 'faq',
            topic: 'preguntas frecuentes',
            answer: "Puedo resolver preguntas frecuentes sobre cursos, certificados, precios, registro, acceso, metodología, soporte y contenido de la plataforma.",
            patterns: ["faq", "preguntas frecuentes", "dudas frecuentes", "dudas", "informacion general"]
        }
    ];

    const courseAreas = [
        { topic: "desarrollo web", label: "Desarrollo Web", patterns: ["desarrollo web", "programacion", "programar", "paginas web", "pagina web", "web", "frontend", "backend", "javascript"], answer: "Desarrollo Web es una buena opción si quieres crear páginas y aplicaciones web. En WoWacademy forma parte del catálogo destacado y está orientado a aprendizaje práctico con proyectos." },
        { topic: "diseno ux", label: "Diseño & UX", patterns: ["diseno", "ux", "ui", "interfaz", "experiencia de usuario", "diseñar"], answer: "Diseño & UX encaja si te interesa crear interfaces claras, visuales y fáciles de usar para productos digitales." },
        { topic: "marketing digital", label: "Marketing Digital", patterns: ["marketing", "redes", "campanas", "publicidad", "ventas online"], answer: "Marketing Digital es ideal si quieres aprender captación, contenidos, campañas y crecimiento de proyectos online." },
        { topic: "inteligencia artificial", label: "Inteligencia Artificial", patterns: ["inteligencia artificial", "ia", "ai", "automatizacion", "chatbot"], answer: "Inteligencia Artificial es recomendable si te interesan herramientas modernas, automatización y soluciones digitales con IA." },
        { topic: "ciberseguridad", label: "Ciberseguridad", patterns: ["ciberseguridad", "seguridad", "hacking", "proteccion", "riesgos"], answer: "Ciberseguridad es una buena ruta si quieres aprender a proteger sistemas, prevenir riesgos y entender amenazas digitales." },
        { topic: "negocios", label: "Negocios", patterns: ["negocios", "empresa", "emprender", "gestion", "estrategia"], answer: "Negocios te puede ayudar si buscas mejorar estrategia, gestión y habilidades para impulsar proyectos o empresas." },
        { topic: "data science", label: "Data Science", patterns: ["data", "datos", "analisis", "data science", "estadistica"], answer: "Data Science encaja si quieres trabajar con datos, análisis e interpretación para tomar mejores decisiones." },
        { topic: "edicion de video", label: "Edición de Vídeo", patterns: ["video", "edicion", "editar video", "audiovisual", "contenido"], answer: "Edición de Vídeo es útil si quieres crear piezas audiovisuales para redes, marcas, formación o proyectos personales." }
    ];

    const relatedSuggestions = [
        { question: "Ver cursos", answer: "Puedes ver cursos destacados de Desarrollo Web, Diseño & UX, Marketing Digital, Inteligencia Artificial, Negocios, Data Science, Ciberseguridad y Edición de Vídeo." },
        { question: "Precios", answer: "Para precios o mensualidades, revisa el curso concreto o contacta con soporte para recibir información actualizada." },
        { question: "Certificados", answer: "WoWacademy presenta formación práctica con certificación asociada al aprendizaje realizado." },
        { question: "Registro", answer: "Puedes registrarte desde Únete gratis o Empieza gratis hoy usando tu nombre, email y contraseña." },
        { question: "Soporte", answer: "Puedes contactar con soporte desde la plataforma o contarme tu duda con más detalle para intentar orientarte." }
    ];

    const fallbackKnowledge = [
        {
            question: "Que es WoWacademy?",
            answer: "WoWacademy es una plataforma de formacion practica de Win O Win para impulsar tu carrera con cursos, proyectos y certificacion.",
            keywords: ["wowacademy", "plataforma", "academia", "win", "winowin"]
        },
        {
            question: "Que cursos hay disponibles?",
            answer: "La plataforma destaca cursos de Desarrollo Web, Diseno & UX, Marketing Digital, Inteligencia Artificial, Negocios, Data Science, Ciberseguridad y Edicion de Video.",
            keywords: ["curso", "cursos", "catalogo", "formacion", "aprender"]
        },
        {
            question: "Como puedo registrarme?",
            answer: "Puedes registrarte desde el boton Unete gratis o Empieza gratis hoy. El formulario pide nombre, email, contrasena y aceptar los terminos.",
            keywords: ["registro", "registrarme", "unirme", "gratis", "cuenta", "alta"]
        },
        {
            question: "Como entro si ya tengo cuenta?",
            answer: "Pulsa Entrar en la parte superior e introduce tu email y contrasena. Si eres admin iras al panel de administracion; si eres alumno iras a tu area.",
            keywords: ["entrar", "login", "sesion", "acceder", "cuenta"]
        },
        {
            question: "La formacion es practica?",
            answer: "Si. La pagina presenta una metodologia orientada a formacion practica, proyectos reales, tutores y aprendizaje con expertos.",
            keywords: ["practica", "metodologia", "proyectos", "tutores", "expertos"]
        },
        {
            question: "Que empresas o partners aparecen?",
            answer: "En la plataforma aparecen Microsoft Partner, Google Education, AWS Academy y Win O Win Hub.",
            keywords: ["partner", "partners", "microsoft", "google", "aws", "hub"]
        }
    ];

    function createChatWidget() {
        if (document.getElementById('chat-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'chat-widget';
        widget.innerHTML = `
            <div id="chat-window">
                <div class="chat-header">
                    <div class="chat-title-row">
                        <img src="${CHATBOT_ICON}" class="header-profile-img" alt="Asistente de WoWacademy">
                        <div>
                            <span class="chat-title-text">Asistente de WoWacademy</span>
                        </div>
                    </div>
                    <button type="button" class="chat-close-btn" aria-label="Cerrar chatbot">&times;</button>
                </div>
                <div id="chat-messages">
                    <div class="msg msg-bot">Hola, soy tu asistente de WoWacademy. Puedo ayudarte con cursos, registro, acceso, noticias y contenido de la plataforma.</div>
                </div>
                <form id="chatForm" class="chat-footer">
                    <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required>
                    <button type="submit" class="send-btn">Enviar</button>
                </form>
            </div>
            <button type="button" class="chat-trigger" aria-label="Abrir chatbot">
                <img src="${CHATBOT_ICON}" alt="Asistente">
            </button>
        `;

        document.body.appendChild(widget);
    }

    function initChatbot() {
        createChatWidget();

        chatForm = document.getElementById('chatForm');
        chatInput = document.getElementById('chatInput');
        chatMessages = document.getElementById('chat-messages');

        if (!chatForm || !chatInput || !chatMessages) return;

        document.querySelector('.chat-trigger')?.addEventListener('click', toggleChat);
        document.querySelector('.chat-close-btn')?.addEventListener('click', toggleChat);

        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const mensaje = chatInput.value.trim();
            if (!mensaje) return;

            appendMessage(mensaje, 'user');
            chatInput.value = '';
            updateChatStats(mensaje);

            const result = await answerFromPlatform(mensaje);
            await showBotResponse(result);
        });
    }

    function toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const chatWidget = document.getElementById('chat-widget');
        if (!chatWindow || !chatWidget) return;

        chatWindow.classList.toggle('active');
        chatWidget.classList.toggle('open', chatWindow.classList.contains('active'));
    }

    function appendMessage(texto, emisor) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg msg-${emisor}`;
        msgDiv.textContent = texto;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function appendOptions(options) {
        if (!Array.isArray(options) || options.length === 0) return;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'chat-options';

        options.slice(0, 6).forEach((option) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-option-btn';
            button.textContent = option.question;
            button.addEventListener('click', async () => {
                appendMessage(option.question, 'user');
                updateChatStats(option.question);
                if (option.topic) {
                    setConversationContext(option.topic, 'recommendation', null);
                }
                await showBotResponse({ answer: option.answer, options: [], suggestions: getRelatedSuggestions() });
            });
            optionsDiv.appendChild(button);
        });

        chatMessages.appendChild(optionsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function showBotResponse(result) {
        const answers = result.answers || [result.answer];
        const options = result.options || [];

        try {
            for (const answer of answers) {
                await showTypingIndicator();
                removeTypingIndicator();
                await appendBotMessageWithTyping(answer);
            }

            if (options.length > 1) {
                appendOptions(options);
            }

            if (result.suggestions && result.suggestions.length) {
                appendSuggestionIntro();
                appendOptions(result.suggestions);
            }
        } catch (error) {
            removeTypingIndicator();
            appendMessage("No he encontrado una coincidencia clara en la plataforma. Puedes preguntarme por cursos, registro, acceso, noticias, partners o metodologia.", 'bot');
        }
    }

    function appendSuggestionIntro() {
        const intro = document.createElement('div');
        intro.className = 'msg msg-bot';
        intro.textContent = "También puedo ayudarte con:";
        chatMessages.appendChild(intro);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        removeTypingIndicator();

        activeTypingIndicator = appendMessage("El asistente está escribiendo...", 'bot msg-typing');
        let dots = 0;
        activeTypingInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            if (activeTypingIndicator) {
                activeTypingIndicator.textContent = `El asistente está escribiendo${'.'.repeat(dots || 1)}`;
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 260);

        return new Promise((resolve) => {
            setTimeout(resolve, 820);
        });
    }

    function removeTypingIndicator() {
        if (activeTypingInterval) {
            clearInterval(activeTypingInterval);
            activeTypingInterval = null;
        }

        document.querySelectorAll('.msg-typing').forEach((indicator) => indicator.remove());
        activeTypingIndicator = null;
    }

    function appendBotMessageWithTyping(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg msg-bot typing-in';
        chatMessages.appendChild(msgDiv);

        let index = 0;
        const speed = 6;

        return new Promise((resolve) => {
            const typeNext = () => {
                msgDiv.textContent = text.slice(0, index);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                if (index >= text.length) {
                    msgDiv.classList.remove('typing-in');
                    resolve();
                    return;
                }

                index += 1;
                setTimeout(typeNext, speed);
            };

            typeNext();
        });
    }

    async function answerFromPlatform(message) {
        const conversationalAnswer = getConversationalAnswer(message);
        if (conversationalAnswer) return conversationalAnswer;

        const contextAnswer = getContextualAnswer(message);
        if (contextAnswer) return contextAnswer;

        const intentAnswer = getIntentAnswer(message);
        if (intentAnswer) return intentAnswer;

        await loadChatKnowledge();
        const matches = findChatMatches(message);

        if (matches.length === 0) {
            saveUnansweredQuestion(message);
            setConversationContext(null, 'unknown', null);
            return {
                answer: "No estoy seguro de haber entendido tu consulta. Puedes reformularla con más detalle o contactar con soporte.",
                options: [],
                suggestions: getRelatedSuggestions()
            };
        }

        if (matches.length === 1) {
            setConversationContext(matches[0].keywords[0] || null, 'platform_match', null);
            return { answer: matches[0].answer, options: [], suggestions: getRelatedSuggestions() };
        }

        setConversationContext(null, 'multiple_matches', null);
        return {
            answer: "He encontrado varias opciones relacionadas. Elige la pregunta que mas te interese:",
            options: matches,
            suggestions: []
        };
    }

    function getConversationalAnswer(message) {
        const normalizedMessage = normalizeText(message).trim();

        if (chatState.awaitingRating) {
            if (matchesIntent(normalizedMessage, conversationalIntents.positiveRating)) {
                chatState.awaitingRating = false;
                updateChatRating('positive');
                setConversationContext(null, 'positive_rating', null);
                return {
                    answer: "Me alegro mucho. Gracias por tu valoración.",
                    options: []
                };
            }

            if (matchesIntent(normalizedMessage, conversationalIntents.negativeRating)) {
                chatState.awaitingRating = false;
                updateChatRating('negative');
                setConversationContext(null, 'negative_rating', null);
                return {
                    answer: "Siento que no haya sido suficiente. Puedes reformular tu pregunta o darme más detalles para intentar ayudarte mejor.",
                    options: []
                };
            }

            chatState.awaitingRating = false;
        }

        if (chatState.awaitingFollowUp) {
            if (matchesIntent(normalizedMessage, conversationalIntents.endConversation)) {
                chatState.awaitingFollowUp = false;
                chatState.awaitingRating = true;
                setConversationContext(null, 'farewell', 'rating');
                return {
                    answers: [
                        "Vale, que tengas un muy buen día. Si necesitas cualquier otra cosa, estaré aquí para ayudarte.",
                        "Antes de irte, ¿te ha resultado útil la respuesta?"
                    ],
                    options: []
                };
            }

            chatState.awaitingFollowUp = false;
        }

        if (matchesIntent(normalizedMessage, conversationalIntents.greetings)) {
            chatState.awaitingFollowUp = false;
            chatState.awaitingRating = false;
            setConversationContext(null, 'saludo', null);
            return {
                answer: randomAnswer([
                    "Hola, ¿en qué puedo ayudarte?",
                    "¡Hola! Estoy aquí para ayudarte.",
                    "Bienvenido/a a WoWacademy. ¿Qué necesitas consultar?"
                ]),
                options: [],
                suggestions: getRelatedSuggestions()
            };
        }

        if (matchesIntent(normalizedMessage, conversationalIntents.thanks)) {
            chatState.awaitingFollowUp = true;
            chatState.awaitingRating = false;
            setConversationContext(null, 'agradecimiento', 'follow_up');
            return {
                answer: "De nada, me alegro de haberte ayudado. ¿Tienes alguna otra consulta?",
                options: []
            };
        }

        if (matchesIntent(normalizedMessage, conversationalIntents.farewells)) {
            chatState.awaitingFollowUp = false;
            chatState.awaitingRating = false;
            setConversationContext(null, 'despedida', null);
            return {
                answer: "Hasta luego. Si necesitas cualquier otra cosa sobre WoWacademy, estaré aquí para ayudarte.",
                options: []
            };
        }

        return null;
    }

    function matchesIntent(message, examples) {
        return examples.some((example) => message === normalizeText(example).trim());
    }

    function getContextualAnswer(message) {
        const normalizedMessage = normalizeText(message);
        const topic = chatState.conversationContext.lastTopic;
        const awaitingAnswer = chatState.conversationContext.awaitingAnswer;

        if (awaitingAnswer === 'course_area') {
            const area = findCourseArea(normalizedMessage);
            if (area) {
                setConversationContext(area.topic, 'course_area', null);
                return { answer: area.answer, options: [], suggestions: getRelatedSuggestions() };
            }
        }

        if (topic && matchesAny(normalizedMessage, ["cuanto dura", "duracion", "tiempo", "horas", "meses", "semanas"])) {
            setConversationContext(topic, 'duration', null);
            return {
                answer: `La duración puede depender del curso de ${formatTopic(topic)} y de la modalidad disponible. Te recomiendo revisar la ficha del curso o contactar con soporte para confirmar el tiempo exacto.`,
                options: [],
                suggestions: getRelatedSuggestions()
            };
        }

        return null;
    }

    function getIntentAnswer(message) {
        const normalizedMessage = normalizeText(message);
        const area = findCourseArea(normalizedMessage);

        if (area) {
            setConversationContext(area.topic, 'course_interest', null);
            return { answer: area.answer, options: [], suggestions: getRelatedSuggestions() };
        }

        const intentMatch = intentDefinitions
            .map((item) => ({ ...item, score: scoreIntent(normalizedMessage, item.patterns) }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)[0];

        if (!intentMatch) return null;

        const awaitingAnswer = intentMatch.intent === 'courses' ? 'course_area' : null;
        setConversationContext(intentMatch.topic, intentMatch.intent, awaitingAnswer);
        recordLastIntent(intentMatch.intent);

        return {
            answer: intentMatch.answer,
            options: intentMatch.options || [],
            suggestions: intentMatch.intent === 'recommendation' ? [] : getRelatedSuggestions()
        };
    }

    function findCourseArea(normalizedMessage) {
        return courseAreas
            .map((area) => ({ ...area, score: scoreIntent(normalizedMessage, area.patterns) }))
            .filter((area) => area.score > 0)
            .sort((a, b) => b.score - a.score)[0] || null;
    }

    function scoreIntent(message, patterns) {
        return patterns.reduce((score, pattern) => {
            const normalizedPattern = normalizeText(pattern);
            const messageTerms = extractKeywords(message);
            if (normalizedPattern.length <= 2) {
                return messageTerms.includes(normalizedPattern) ? score + 3 : score;
            }

            if (message === normalizedPattern) return score + 4;
            if (message.includes(normalizedPattern)) return score + 3;

            const patternTerms = extractKeywords(normalizedPattern);
            const matches = patternTerms.filter((term) => messageTerms.includes(term)).length;
            return score + matches;
        }, 0);
    }

    function matchesAny(message, patterns) {
        return patterns.some((pattern) => message.includes(normalizeText(pattern)));
    }

    function setConversationContext(lastTopic, lastIntent, awaitingAnswer) {
        chatState.conversationContext = {
            lastTopic,
            lastIntent,
            awaitingAnswer
        };
        recordLastIntent(lastIntent);
    }

    function formatTopic(topic) {
        const area = courseAreas.find((item) => item.topic === topic);
        return area ? area.label : topic;
    }

    function randomAnswer(answers) {
        return answers[Math.floor(Math.random() * answers.length)];
    }

    function getRelatedSuggestions() {
        return relatedSuggestions;
    }

    function getStoredChatStats() {
        const emptyStats = {
            messagesSent: 0,
            repeatedQuestions: {},
            unansweredQuestions: [],
            lastIntent: null,
            ratings: { positive: 0, negative: 0 }
        };

        try {
            const storedStats = JSON.parse(localStorage.getItem('wowacademyChatStats') || '{}');
            return {
                ...emptyStats,
                ...storedStats,
                repeatedQuestions: storedStats.repeatedQuestions || emptyStats.repeatedQuestions,
                unansweredQuestions: storedStats.unansweredQuestions || emptyStats.unansweredQuestions,
                ratings: { ...emptyStats.ratings, ...(storedStats.ratings || {}) }
            };
        } catch (error) {
            return emptyStats;
        }
    }

    function saveChatStats(stats) {
        localStorage.setItem('wowacademyChatStats', JSON.stringify(stats));
    }

    function updateChatStats(question) {
        const normalizedQuestion = normalizeText(question);
        const stats = getStoredChatStats();
        stats.messagesSent += 1;
        stats.repeatedQuestions[normalizedQuestion] = (stats.repeatedQuestions[normalizedQuestion] || 0) + 1;
        saveChatStats(stats);
    }

    function recordLastIntent(intent) {
        if (!intent) return;
        const stats = getStoredChatStats();
        stats.lastIntent = intent;
        saveChatStats(stats);
    }

    function updateChatRating(type) {
        const stats = getStoredChatStats();
        stats.ratings[type] = (stats.ratings[type] || 0) + 1;
        saveChatStats(stats);
    }

    function saveUnansweredQuestion(question) {
        const stats = getStoredChatStats();
        stats.unansweredQuestions.push({ question, date: new Date().toISOString() });
        stats.unansweredQuestions = stats.unansweredQuestions.slice(-50);
        saveChatStats(stats);
        localStorage.setItem('unansweredQuestions', JSON.stringify(stats.unansweredQuestions));
    }

    async function loadChatKnowledge() {
        if (chatKnowledge.loaded) return;

        chatKnowledge.items = [
            ...fallbackKnowledge,
            ...buildPageKnowledge(),
            ...await fetchKnowledge('/api/cursos?limit=20', 'curso'),
            ...await fetchKnowledge('/api/news?limit=20', 'noticia')
        ];
        chatKnowledge.loaded = true;
    }

    function buildPageKnowledge() {
        const items = [];

        document.querySelectorAll('.cat-card strong').forEach((node) => {
            const title = cleanText(node.textContent);
            if (!title) return;
            items.push({
                question: `Que puedo aprender sobre ${title}?`,
                answer: `${title} forma parte del catalogo destacado de WoWacademy. Puedes verlo desde el catalogo de cursos para revisar la oferta disponible.`,
                keywords: extractKeywords(title)
            });
        });

        document.querySelectorAll('.partners a span').forEach((node) => {
            const title = cleanText(node.textContent);
            if (!title) return;
            items.push({
                question: `Que relacion tiene WoWacademy con ${title}?`,
                answer: `${title} aparece como referencia o partner dentro de la plataforma WoWacademy.`,
                keywords: extractKeywords(title)
            });
        });

        return items;
    }

    async function fetchKnowledge(url, type) {
        try {
            const response = await fetch(url);
            if (!response.ok) return [];

            const payload = await response.json();
            const rows = Array.isArray(payload.data) ? payload.data : [];

            return rows.map((row) => {
                const title = cleanText(row.titulo || row.title || 'Contenido');
                const body = cleanText(row.descripcion || row.contenido || '');
                const typeLabel = type === 'curso' ? 'curso' : 'noticia';

                return {
                    question: type === 'curso' ? `Que incluye el curso ${title}?` : `Que dice la noticia ${title}?`,
                    answer: body ? `Esta ${typeLabel} de la plataforma trata sobre: ${body}` : `He encontrado ${typeLabel} en la plataforma: ${title}.`,
                    keywords: extractKeywords(`${title} ${body} ${typeLabel}`)
                };
            });
        } catch (error) {
            return [];
        }
    }

    function findChatMatches(message) {
        const terms = extractKeywords(message);
        if (terms.length === 0) return [];

        return chatKnowledge.items
            .map((item) => {
                const score = item.keywords.reduce((total, keyword) => total + (terms.includes(keyword) ? 1 : 0), 0);
                return { ...item, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score || a.question.localeCompare(b.question));
    }

    function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function extractKeywords(value) {
        const stopWords = new Set(['para', 'como', 'donde', 'cuando', 'sobre', 'quiero', 'puedo', 'tengo', 'esta', 'este', 'esto', 'todo', 'una', 'uno', 'los', 'las', 'con', 'por', 'que', 'del']);
        return normalizeText(value)
            .split(' ')
            .filter((word) => word.length > 2 && !stopWords.has(word));
    }

    function normalizeText(value) {
        return cleanText(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9ñ\s]/g, ' ');
    }

    window.toggleChat = toggleChat;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
