// Shared client-side behaviors for StudyBuddy (simple, unobtrusive)
document.addEventListener('DOMContentLoaded', () => {
    const profileIcon = document.getElementById('profile-icon');
    const profileContainer = document.querySelector('.user-profile');
    const saveBtn = document.querySelector('.save-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    const profileKey = 'studybuddy_profile_v1';

    function loadProfile() {
        try {
            const raw = localStorage.getItem(profileKey);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (usernameInput) usernameInput.value = data.username || '';
            if (emailInput) emailInput.value = data.email || '';
            if (phoneInput) phoneInput.value = data.phone || '';
        } catch (e) { /* ignore */ }
    }

    function saveProfile() {
        const data = {
            username: usernameInput ? usernameInput.value : '',
            email: emailInput ? emailInput.value : '',
            phone: phoneInput ? phoneInput.value : ''
        };
        try {
            localStorage.setItem(profileKey, JSON.stringify(data));
            alert('Profile saved locally.');
            if (profileContainer) profileContainer.classList.remove('open');
        } catch (e) {
            console.error('Failed to save profile', e);
        }
    }

    if (profileIcon && profileContainer) {
        profileIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            profileContainer.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!profileContainer.contains(e.target)) {
                profileContainer.classList.remove('open');
            }
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem(profileKey);
        alert('You have been logged out (local data cleared).');
        // redirect to main landing page if available
        if (window.location.pathname.indexOf('studybuddy') === -1) {
            window.location.href = 'studybuddy.html';
        } else {
            // if already on landing, just close the dropdown
            if (profileContainer) profileContainer.classList.remove('open');
        }
    });

    loadProfile();

    // Search: filter .post and .question-card client-side
    document.querySelectorAll('.search-bar input').forEach(input => {
        input.addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            if (!q) {
                document.querySelectorAll('.post, .question-card').forEach(el => el.style.display = '');
                return;
            }
            document.querySelectorAll('.post, .question-card').forEach(el => {
                const text = el.innerText.toLowerCase();
                el.style.display = text.indexOf(q) !== -1 ? '' : 'none';
            });
        });
    });

    // On the homepage, make the search bar also trigger Read More navigation
    (function addHomeSearchBehavior(){
        const searchBar = document.querySelector('.search-bar');
        const postGrid = document.querySelector('.post-grid');
        if (!searchBar || !postGrid) return; // only on homepage
        const input = searchBar.querySelector('input');
        const btn = searchBar.querySelector('button');

        function doHomeSearch() {
            if (!input) return;
            const q = input.value.trim().toLowerCase();
            if (!q) return;
            // try to find a featured post that matches title or description
            const posts = Array.from(document.querySelectorAll('.post-grid .post'));
            let found = null;
            for (const p of posts) {
                const title = (p.querySelector('h3') && p.querySelector('h3').textContent || '').toLowerCase();
                const desc = (p.querySelector('p') && p.querySelector('p').textContent || '').toLowerCase();
                if (title.includes(q) || desc.includes(q)) { found = p; break; }
            }
            if (found) {
                const link = found.querySelector('.read-more');
                if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') {
                    // navigate to the resource
                    window.location.href = link.getAttribute('href');
                    return;
                }
            }
            // fallback: filter posts like the default behavior
            document.querySelectorAll('.post, .question-card').forEach(el => {
                const text = el.innerText.toLowerCase();
                el.style.display = text.indexOf(q) !== -1 ? '' : 'none';
            });
        }

        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); doHomeSearch(); });
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doHomeSearch(); } });
    })();

    // Practice questions: show/hide answers
    document.querySelectorAll('.show-answer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ans = btn.nextElementSibling;
            if (!ans) return;
            ans.classList.toggle('show');
            btn.textContent = ans.classList.contains('show') ? 'Hide Answer' : 'Show Answer';
        });
    });

    // Student answers persistence (simple localStorage per question)
    const answersKey = 'studybuddy_answers_v1';

    function loadAnswers() {
        try {
            const raw = localStorage.getItem(answersKey);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch (e) {
            return {};
        }
    }

    function saveAnswers(obj) {
        try {
            localStorage.setItem(answersKey, JSON.stringify(obj));
        } catch (e) {
            console.error('Failed to save answers', e);
        }
    }

    const savedAnswers = loadAnswers();
    // scoreboard elements
    const submittedCountEl = document.getElementById('submitted-count');
    const correctCountEl = document.getElementById('correct-count');

    function updateScoreboard() {
        if (!submittedCountEl || !correctCountEl) return;
        const vals = Object.values(savedAnswers || {});
        const submittedCount = vals.filter(v => v && typeof v === 'object' && v.submitted).length;
        const correctCount = vals.filter(v => v && typeof v === 'object' && v.submitted && v.correct).length;
        submittedCountEl.textContent = String(submittedCount);
        correctCountEl.textContent = String(correctCount);
    }
    document.querySelectorAll('.question-card').forEach(card => {
        const titleEl = card.querySelector('h3');
        // prefer stable data-qid when available
        const key = card.dataset.qid || (titleEl ? titleEl.textContent.trim() : null);
        const textarea = card.querySelector('.student-answer');
        const submitBtn = card.querySelector('.submit-answer-btn');
        const correctEl = card.querySelector('.answer');
        const feedbackEl = card.querySelector('.feedback');

        if (textarea && key) {
            const saved = savedAnswers[key];
            if (saved) {
                if (typeof saved === 'string') textarea.value = saved;
                else if (typeof saved === 'object') textarea.value = saved.text || '';
                // if it was previously submitted, lock the textarea and mark UI & feedback
                if (saved.submitted) {
                    textarea.disabled = true;
                    if (submitBtn) {
                        submitBtn.textContent = 'Submitted';
                        submitBtn.classList.add('submitted');
                        // show correctness state if available
                        if (saved.correct) {
                            submitBtn.classList.add('correct');
                            if (feedbackEl) feedbackEl.textContent = 'Correct!';
                        } else {
                            submitBtn.classList.add('incorrect');
                            if (feedbackEl) feedbackEl.textContent = 'Incorrect — correct answer: ' + (correctEl ? correctEl.textContent : '');
                        }
                        submitBtn.disabled = false; // allow toggle to edit
                    }
                }
            }

            // save on input (debounced minimal)
            let timeout = null;
            textarea.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const existing = savedAnswers[key];
                    const submitted = existing && typeof existing === 'object' ? !!existing.submitted : false;
                    savedAnswers[key] = { text: textarea.value, submitted };
                    saveAnswers(savedAnswers);
                }, 300);
            });
        }

        if (submitBtn && key) {
            submitBtn.addEventListener('click', () => {
                const existing = savedAnswers[key];
                const alreadySubmitted = existing && typeof existing === 'object' && existing.submitted;

                if (alreadySubmitted) {
                    // toggle back to edit mode
                    savedAnswers[key].submitted = false;
                    // preserve text but clear correctness
                    if (savedAnswers[key]) savedAnswers[key].correct = false;
                    saveAnswers(savedAnswers);
                    if (textarea) textarea.disabled = false;
                    submitBtn.textContent = 'Submit Answer';
                    submitBtn.classList.remove('submitted', 'correct', 'incorrect');
                    if (feedbackEl) feedbackEl.textContent = '';
                    updateScoreboard();
                } else {
                    // submit current answer and check correctness
                    const text = textarea ? textarea.value : '';
                    // get correct answer text
                    const correctText = correctEl ? correctEl.textContent.trim() : '';

                    function normalize(s) {
                        return String(s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
                    }

                    function compareAnswers(student, correct) {
                        const s = normalize(student);
                        const c = normalize(correct);
                        if (!s) return false;
                        if (s === c) return true;
                        // numeric comparison
                        const sn = parseFloat(s);
                        const cn = parseFloat(c);
                        if (!isNaN(sn) && !isNaN(cn) && Math.abs(sn - cn) < 1e-6) return true;
                        // containment
                        if (s.includes(c) || c.includes(s)) return true;
                        // word overlap
                        const sWords = new Set(s.split(' ').filter(Boolean));
                        const cWords = new Set(c.split(' ').filter(Boolean));
                        const common = [...sWords].filter(w => cWords.has(w)).length;
                        const denom = Math.max(sWords.size, cWords.size);
                        if (denom > 0 && (common / denom) >= 0.6) return true;
                        return false;
                    }

                    const isCorrect = compareAnswers(text, correctText);
                    savedAnswers[key] = { text, submitted: true, correct: !!isCorrect };
                    saveAnswers(savedAnswers);
                    if (textarea) textarea.disabled = true;
                    submitBtn.textContent = 'Submitted';
                    submitBtn.classList.add('submitted');
                    if (isCorrect) {
                        submitBtn.classList.add('correct');
                        submitBtn.classList.remove('incorrect');
                        if (feedbackEl) feedbackEl.textContent = 'Correct!';
                        updateScoreboard();
                    } else {
                        submitBtn.classList.add('incorrect');
                        submitBtn.classList.remove('correct');
                        if (feedbackEl) feedbackEl.textContent = 'Incorrect — correct answer: ' + correctText;
                        updateScoreboard();
                    }
                }
            });
        }
    });

    // update scoreboard initially
    updateScoreboard();

    // Subject filters (Practice Questions page)
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length) {
        filterBtns.forEach(b => {
            b.addEventListener('click', () => {
                filterBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                const subject = b.textContent.trim().toLowerCase();
                document.querySelectorAll('.question-card').forEach(card => {
                    const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
                    if (subject === 'all subjects') card.style.display = '';
                    else card.style.display = title.indexOf(subject) !== -1 ? '' : 'none';
                });
            });
        });
    }
});
