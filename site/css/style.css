:root {
    --bg: #0a0e14;
    --surface: #141b22;
    --surface-light: #1c2330;
    --surface-hover: #222b38;
    --gold: #c9a84c;
    --gold-light: #d4b960;
    --gold-dim: #8b7535;
    --blue: #4a90d9;
    --blue-light: #5da0e5;
    --blue-dark: #1e3a5f;
    --text: #d0d5dd;
    --text-bright: #e8ecf2;
    --text-dim: #8892a3;
    --danger: #d94a4a;
    --danger-bg: #2b0d0d;
    --danger-border: #5c1f1f;
    --success: #4ac97e;
    --success-bg: #0d2b1a;
    --success-border: #1a4a2a;
    --warning: #d9a84a;
    --warning-bg: #2b2410;
    --warning-border: #5c4a1f;
    --info-bg: #0d1f2b;
    --info-border: #1f3f5c;
    --border: #2a3340;
    --radius: 6px;
    --radius-lg: 10px;
    --sidebar-width: 260px;
    --transition: 0.2s ease;
    font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    background: var(--bg);
    color: var(--text);
    display: flex;
    height: 100vh;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}

/* ========= SCROLLBAR ========= */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3a4455; }

/* ========= SIDEBAR ========= */
.sidebar {
    width: var(--sidebar-width);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 10;
}

.logo {
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
}
.logo-icon {
    width: 42px; height: 42px;
    background: linear-gradient(135deg, var(--gold-dim), var(--gold));
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; color: #000; font-size: 18px;
    flex-shrink: 0;
}
.logo-icon svg { width: 28px; height: 28px; }
.logo-text { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-bright); }
.logo-sub { font-size: 10px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; }

.nav { flex: 1; padding: 8px 0; overflow-y: auto; }
.nav-section {
    padding: 12px 16px 6px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--text-dim);
    font-weight: 600;
}
.nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    margin: 2px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all var(--transition);
    font-size: 13px;
    color: var(--text-dim);
    border: none;
    background: none;
    width: calc(100% - 16px);
    text-align: left;
    position: relative;
}
.nav-item:hover { background: var(--surface-hover); color: var(--text); }
.nav-item.active { background: var(--blue-dark); color: var(--blue-light); font-weight: 600; }
.nav-item .nav-icon { font-size: 15px; flex-shrink: 0; }
.nav-item .badge {
    margin-left: auto;
    background: var(--gold-dim);
    color: #000;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
}

.user-bar {
    padding: 14px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
}
.avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--blue-dark);
    color: var(--blue-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 15px;
    border: 2px solid var(--border);
    flex-shrink: 0;
}
.user-info { font-size: 12px; line-height: 1.3; flex: 1; }
.user-name { font-weight: 600; color: var(--text-bright); }
.user-role { color: var(--gold); font-size: 10px; }

/* ========= MAIN ========= */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.tabs {
    display: flex;
    gap: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 16px;
    height: 44px;
    align-items: stretch;
    overflow-x: auto;
    flex-shrink: 0;
}
.tab {
    padding: 0 18px;
    font-size: 13px;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--text-dim);
    border-bottom: 2px solid transparent;
    transition: all var(--transition);
    white-space: nowrap;
    font-weight: 500;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--blue-light); border-bottom-color: var(--blue); font-weight: 600; }

.content { flex: 1; overflow-y: auto; padding: 24px 28px; }

/* ========= TYPOGRAPHY ========= */
h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; color: var(--text-bright); }
h3 { font-size: 17px; font-weight: 600; margin: 20px 0 10px; color: #e0e4eb; }
h4 { font-size: 14px; font-weight: 600; color: var(--gold-light); margin-bottom: 8px; }
h5 { font-size: 13px; font-weight: 600; color: var(--text-bright); margin-bottom: 6px; }
.subtitle { color: var(--text-dim); font-size: 13px; margin-bottom: 20px; }
.page-description {
    background: var(--surface-light);
    border-left: 3px solid var(--blue);
    padding: 12px 16px;
    border-radius: 0 var(--radius) var(--radius) 0;
    margin-bottom: 20px;
    font-size: 13px;
    color: var(--text-dim);
}

/* ========= CARDS ========= */
.card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 12px;
}
.card-accent { border-left: 3px solid var(--gold); }
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
}
.card-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
}
.card-item:hover {
    border-color: var(--blue);
    background: var(--surface-hover);
    transform: translateY(-1px);
}
.card-icon { font-size: 32px; margin-bottom: 12px; }
.card-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; color: var(--text-bright); }
.card-desc { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
.card-meta { display: flex; gap: 12px; margin-top: 10px; font-size: 11px; color: var(--text-dim); flex-wrap: wrap; }

/* ========= DOCUMENT ARTICLES ========= */
.doc-article {
    background: var(--surface-light);
    border-left: 3px solid var(--gold);
    padding: 14px 18px;
    border-radius: 0 var(--radius) var(--radius) 0;
    margin-bottom: 10px;
    transition: all var(--transition);
    position: relative;
}
.doc-article:hover { border-left-color: var(--blue); }
.doc-article .article-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
    gap: 8px;
}
.doc-article .article-num { color: var(--gold-light); font-weight: 700; font-size: 13px; }
.doc-article .article-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--blue-dark);
    color: var(--blue-light);
    font-weight: 600;
    white-space: nowrap;
}
.doc-article .article-text { margin-top: 4px; font-size: 13px; line-height: 1.6; }
.doc-article .article-hint {
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-dim);
    background: #1a1f2b;
    padding: 10px 14px;
    border-radius: var(--radius);
    border-left: 2px solid var(--blue);
    line-height: 1.5;
}
.doc-article .article-hint strong { color: var(--blue-light); }

/* ========= ARTICLE BADGE ========= */
.article-badge-fso {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--gold-dim);
    color: #000;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: 0.5px;
}

/* ========= INSTRUCTION BLOCKS ========= */
.instruction-block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 16px;
    position: relative;
}
.instruction-block h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
}
.instruction-step {
    display: flex;
    gap: 14px;
    margin-bottom: 14px;
    align-items: flex-start;
}
.step-number {
    width: 28px; height: 28px;
    background: var(--blue-dark);
    color: var(--blue-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
}
.step-content { flex: 1; }
.step-content strong { color: var(--text-bright); }
.step-content .step-note { font-size: 12px; color: var(--text-dim); margin-top: 4px; font-style: italic; }

.instruction-text-block {
    margin-bottom: 16px;
    line-height: 1.7;
}

/* ========= ALERT BOXES ========= */
.alert-box {
    padding: 14px 18px;
    border-radius: var(--radius);
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.6;
}
.alert-warning { background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning); }
.alert-danger { background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger); }
.alert-info { background: var(--info-bg); border: 1px solid var(--info-border); color: var(--blue-light); }

/* ========= BUTTONS ========= */
.btn {
    padding: 10px 22px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all var(--transition);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
}
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { background: #3a7bc8; }
.btn-success { background: var(--success); color: #000; }
.btn-success:hover { background: #3ab86e; }
.btn-gold { background: var(--gold); color: #000; }
.btn-gold:hover { background: #b8943a; }
.btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--blue); color: var(--blue-light); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #c43a3a; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-xs { padding: 2px 6px; font-size: 10px; border-radius: 4px; }

/* ========= EDIT BUTTONS ========= */
.edit-btn {
    opacity: 0;
    transition: opacity var(--transition);
    padding: 4px 10px;
    font-size: 11px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-dim);
    cursor: pointer;
    font-family: inherit;
}
.doc-article:hover .edit-btn,
.instruction-block:hover .edit-btn,
.card-item:hover .edit-btn {
    opacity: 1;
}
.edit-btn:hover { background: var(--blue-dark); color: var(--blue-light); border-color: var(--blue); }
.edit-btn.delete:hover { background: var(--danger-bg); color: var(--danger); border-color: var(--danger); }

/* ========= EDITOR FORMS ========= */
.editor-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.form-group input,
.form-group textarea,
.form-group select {
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    transition: border-color var(--transition);
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--blue);
}
.form-group textarea { resize: vertical; min-height: 80px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions {
    display: flex;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
}
.form-input {
    width: 100%;
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-size: 14px;
}
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-bright);
}
.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--gold);
}

/* ========= EXAM TOPIC ROW ========= */
.exam-topic-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
}
.exam-topic-row select,
.exam-topic-row input {
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 10px;
    color: var(--text);
    font-size: 12px;
    font-family: inherit;
}

/* ========= QUIZ STYLES ========= */
.quiz-container { max-width: 750px; }
.quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
}
.quiz-progress {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: var(--text-dim);
    flex: 1;
}
.progress-bar {
    flex: 1;
    height: 6px;
    background: var(--surface-light);
    border-radius: 3px;
    min-width: 100px;
}
.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--blue), var(--blue-light));
    border-radius: 3px;
    transition: width 0.4s ease;
}
.quiz-timer { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.quiz-timer.warning { color: var(--danger); animation: pulse 1s infinite; }

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.question-block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 16px;
}
.question-category {
    font-size: 11px;
    color: var(--gold-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}
.question-text {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 24px;
    color: var(--text-bright);
    line-height: 1.5;
}

.option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 18px;
    margin-bottom: 8px;
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all var(--transition);
}
.option:hover { border-color: var(--blue); background: #1a2333; }
.option.selected { border-color: var(--blue); background: var(--blue-dark); }
.option.correct { border-color: var(--success); background: var(--success-bg); }
.option.wrong { border-color: var(--danger); background: var(--danger-bg); }
.option.disabled { pointer-events: none; opacity: 0.8; }

.option-marker {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid var(--text-dim);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all var(--transition);
}
.option.selected .option-marker { border-color: var(--blue-light); background: var(--blue); color: #fff; }
.option.correct .option-marker { border-color: var(--success); background: var(--success); color: #fff; }
.option.wrong .option-marker { border-color: var(--danger); background: var(--danger); color: #fff; }

.quiz-explanation {
    margin-top: 16px;
    padding: 14px 18px;
    border-radius: var(--radius);
    font-size: 13px;
    line-height: 1.6;
    display: none;
}
.quiz-explanation.show { display: block; }
.quiz-explanation.correct-exp { background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success); }
.quiz-explanation.wrong-exp { background: var(--danger-bg); border: 1px solid var(--danger-border); color: #e88; }

.quiz-actions { display: flex; gap: 12px; justify-content: space-between; margin-top: 8px; }

/* ========= RESULT CARD ========= */
.result-card { text-align: center; padding: 40px 30px; }
.result-icon { font-size: 64px; margin-bottom: 16px; }
.result-score { font-size: 56px; font-weight: 700; color: var(--gold-light); line-height: 1; }
.result-status { font-size: 20px; margin: 10px 0; font-weight: 600; }
.result-details { margin: 16px 0; color: var(--text-dim); font-size: 14px; }
.result-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }

/* ========= STATISTICS ========= */
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
}
.stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
}
.stat-value { font-size: 36px; font-weight: 700; line-height: 1.1; }
.stat-label { font-size: 12px; color: var(--text-dim); margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }

.results-table { width: 100%; border-collapse: collapse; }
.results-table th {
    text-align: left;
    padding: 10px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-dim);
    border-bottom: 1px solid var(--border);
}
.results-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.status-passed { background: var(--success-bg); color: var(--success); }
.status-failed { background: var(--danger-bg); color: var(--danger); }

/* ========= MODAL ========= */
.modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 100;
    align-items: center;
    justify-content: center;
}
.modal-overlay.show { display: flex; }
.modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: 650px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
}
.modal-close {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 24px;
    cursor: pointer;
    padding: 0 4px;
}
.modal-close:hover { color: var(--text); }
.modal-body { padding: 20px; }

/* ========= PASSWORD MODAL ========= */
.password-modal { text-align: center; padding: 20px; }
.password-modal input {
    font-size: 28px;
    letter-spacing: 6px;
    text-align: center;
    width: 220px;
    padding: 12px;
    background: var(--surface-light);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-bright);
    margin: 16px 0;
    font-family: monospace;
}
.password-modal input:focus { border-color: var(--gold); outline: none; }

/* ========= ADMIN PANEL ========= */
.admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}
.admin-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
}
.admin-section h4 { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

/* ========= NOTIFICATIONS ========= */
.notification {
    padding: 12px 20px;
    border-radius: var(--radius);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.notification-success { background: var(--success); }
.notification-error { background: var(--danger); }
.notification-info { background: var(--blue); }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

/* ========= INSTRUCTION EDITOR ========= */
.instruction-editor {
    max-width: 800px;
    margin: 0 auto;
}
.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
}
.editor-toolbar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 20px;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    position: sticky;
    top: 0;
    z-index: 5;
}
.toolbar-btn {
    padding: 8px 14px;
    border: 1px solid var(--border);
    background: var(--surface-light);
    color: var(--text);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: all var(--transition);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
}
.toolbar-btn:hover {
    background: var(--blue-dark);
    border-color: var(--blue);
    color: var(--blue-light);
}
.editor-canvas {
    min-height: 300px;
}
.editor-block {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
}
.editor-block:hover {
    border-color: #3a4455;
}
.editor-block.selected {
    border-color: var(--blue) !important;
    background: var(--surface-hover);
}
.block-controls {
    position: absolute;
    top: -12px;
    right: 12px;
    display: flex;
    gap: 4px;
    background: var(--surface);
    padding: 4px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    z-index: 2;
}
.block-input {
    width: 100%;
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    transition: border-color var(--transition);
}
.block-input:focus {
    outline: none;
    border-color: var(--blue);
}
.block-title-input {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-bright);
}
.block-text-input {
    resize: vertical;
    min-height: 80px;
}
.block-alert-input {
    background: transparent;
    border: 1px dashed var(--border);
    resize: vertical;
    min-height: 60px;
}
.block-title-display h4 {
    font-size: 18px;
    color: var(--text-bright);
    margin: 0;
}
.block-text-display p {
    margin: 0;
    line-height: 1.6;
}
.block-steps-display h4 {
    margin-bottom: 12px;
}
.block-steps-display ol {
    padding-left: 20px;
}
.block-steps-display li {
    margin-bottom: 8px;
    line-height: 1.6;
}
.block-alert-display {
    padding: 14px 18px;
    border-radius: var(--radius);
    font-size: 13px;
    line-height: 1.6;
}
.block-alert-display.alert-warning {
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    color: var(--warning);
}
.block-alert-display.alert-info {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    color: var(--blue-light);
}
.block-alert-display.alert-danger {
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    color: var(--danger);
}
.block-image-display {
    text-align: center;
}
.block-image-display img {
    max-width: 100%;
    max-height: 400px;
    border-radius: var(--radius);
    object-fit: contain;
}
.block-list-display h4 {
    margin-bottom: 8px;
}
.block-list-display ul {
    padding-left: 20px;
}
.block-list-display li {
    margin-bottom: 6px;
    line-height: 1.6;
}

/* ========= ACCORDION ========= */
.accordion { margin-bottom: 8px; }
.accordion-header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 18px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-bright);
    transition: all var(--transition);
}
.accordion-header:hover { background: var(--surface-hover); }
.accordion-header .accordion-arrow {
    transition: transform var(--transition);
    font-size: 12px;
}
.accordion-header.open .accordion-arrow { transform: rotate(180deg); }
.accordion-body {
    display: none;
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 var(--radius) var(--radius);
    padding: 16px;
}
.accordion-body.show { display: block; }

/* ========= EMPTY STATE ========= */
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-dim);
}
.empty-state .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}
.empty-state h4 {
    color: var(--text-bright);
    margin-bottom: 8px;
}
.empty-state p {
    margin-bottom: 8px;
}

/* ========= SECTION DIVIDER ========= */
.section-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 20px 0;
}

/* ========= ORG STRUCTURE ========= */
.org-top-level {
    display: flex;
    justify-content: center;
    margin-bottom: 0;
}
.org-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    text-align: center;
    position: relative;
}
.org-card-director {
    border: 2px solid var(--gold);
    background: linear-gradient(135deg, var(--surface), #1a1f2b);
    min-width: 300px;
}
.org-card-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--gold);
    color: #000;
    padding: 4px 16px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
}
.org-card h3 {
    color: var(--gold-light);
    margin-bottom: 8px;
}
.org-rank {
    color: var(--blue-light);
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
}
.org-name {
    color: var(--text-bright);
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
}
.org-duties {
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.5;
}
.org-empty {
    color: var(--text-dim);
    font-style: italic;
    font-size: 13px;
    padding: 8px;
    background: var(--surface-light);
    border-radius: var(--radius);
}
.org-connector-line {
    width: 2px;
    height: 24px;
    background: var(--border);
    margin: 0 auto 8px;
}
.org-departments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 20px;
}
.org-department-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
}
.org-dept-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
}
.org-dept-title h4 {
    color: var(--text-bright);
    font-size: 16px;
    margin-bottom: 4px;
}
.org-dept-desc {
    color: var(--text-dim);
    font-size: 12px;
}
.org-dept-tasks {
    color: var(--text-dim);
    font-size: 11px;
    margin-top: 4px;
}
.org-dept-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}
.org-person-card {
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 8px;
    position: relative;
}
.org-person-small {
    padding: 10px 12px;
    font-size: 12px;
}
.org-person-badge {
    position: absolute;
    top: -8px;
    left: 12px;
    background: var(--blue-dark);
    color: var(--blue-light);
    padding: 2px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
}
.org-person-title {
    color: var(--text-dim);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
}
.org-person-rank {
    color: var(--blue-light);
    font-weight: 600;
    font-size: 13px;
}
.org-person-name {
    color: var(--text-bright);
    font-weight: 700;
    font-size: 14px;
}
.org-person-deputy {
    border-left: 2px solid var(--gold-dim);
}
.org-deputies-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}
.org-subdivisions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--border);
}
.org-sub-connector {
    width: 2px;
    height: 12px;
    background: var(--border);
    margin: 0 auto;
}
.org-subdivisions h5 {
    text-align: center;
}
.org-subdivisions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.org-sub-card {
    background: var(--surface-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
}
.org-sub-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
}
.org-sub-header h5 {
    margin: 0;
    color: var(--text-bright);
    font-size: 13px;
}
.org-sub-actions {
    display: flex;
    gap: 2px;
}
.org-sub-desc {
    font-size: 11px;
    color: var(--text-dim);
    margin-bottom: 4px;
}
.org-sub-tasks {
    font-size: 10px;
    color: var(--text-dim);
    margin-bottom: 8px;
}
.org-rank-line {
    color: var(--text-dim);
    font-size: 13px;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
}
.org-rank-line:last-child {
    border-bottom: none;
}

/* ========= RESPONSIVE ========= */
@media (max-width: 900px) {
    .sidebar { width: 60px; }
    .logo-text, .logo-sub, .nav-item span:not(.nav-icon), 
    .user-info, .badge, .nav-section { display: none; }
    .logo { justify-content: center; padding: 14px 0; }
    .logo-icon { width: 36px; height: 36px; }
    .nav-item { justify-content: center; padding: 12px; }
    .nav-item .nav-icon { font-size: 18px; }
    .content { padding: 16px; }
    .card-grid { grid-template-columns: 1fr; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .form-row { grid-template-columns: 1fr; }
    .org-departments-grid { grid-template-columns: 1fr; }
    .org-deputies-row,
    .org-subdivisions-grid { grid-template-columns: 1fr; }
    .org-card-director { min-width: auto; }
}