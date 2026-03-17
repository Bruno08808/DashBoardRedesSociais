// Instâncias dos gráficos encapsuladas — sem variáveis globais soltas
const charts = { timeline: null, bar: null };

async function carregarDashboard() {
    const profile = await getUserProfile();

    if (profile.role !== "admin") {
        const adminSection = document.getElementById("admin-section");
        if (adminSection) adminSection.style.display = "none";
    }

    await renderizarGraficos();
}

async function renderizarGraficos() {
    const startDate = document.getElementById("startDate")?.value;
    const endDate   = document.getElementById("endDate")?.value;

    // Loading state
    setLoadingState(true);

    let query = supabaseClient
        .from("metricas_diarias")
        .select("*, campanhas(nome)")
        .order("data_registo", { ascending: true });

    if (startDate && endDate) {
        query = query.gte("data_registo", startDate).lte("data_registo", endDate);
    }

    const { data: metricas, error } = await query;

    setLoadingState(false);

    if (error) {
        showDashboardError("Erro ao carregar dados: " + error.message);
        return;
    }

    if (!metricas || metricas.length === 0) {
        showDashboardError("Sem dados para o período selecionado.");
        return;
    }

    const datas      = metricas.map(m => m.data_registo);
    const conversoes = metricas.map(m => m.conversoes);

    const totalGasto = metricas.reduce((a, b) => a + Number(b.investimento), 0);
    const totalConv  = metricas.reduce((a, b) => a + Number(b.conversoes), 0);

    const elSpend = document.getElementById("total-spend");
    const elConvs = document.getElementById("total-convs");
    if (elSpend) elSpend.innerText = "€ " + totalGasto.toFixed(2);
    if (elConvs) elConvs.innerText = totalConv;

    // Destruir instâncias anteriores antes de recriar (evita memory leaks)
    if (charts.timeline) { charts.timeline.destroy(); charts.timeline = null; }

    const ctxTimeline = document.getElementById("timelineChart");
    if (ctxTimeline) {
        charts.timeline = new Chart(ctxTimeline, {
            type: "line",
            data: {
                labels: datas,
                datasets: [{
                    label: "Conversões",
                    data: conversoes,
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34,197,94,0.06)",
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: "#94a3b8" } } },
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "#f1f5f9" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { color: "#f1f5f9" }, beginAtZero: true }
                }
            }
        });
    }

    // Agrupar por campanha
    const campanhaMap = {};
    metricas.forEach(m => {
        const nome = m.campanhas?.nome || "Desconhecida";
        campanhaMap[nome] = (campanhaMap[nome] || 0) + m.conversoes;
    });

    if (charts.bar) { charts.bar.destroy(); charts.bar = null; }

    const ctxBar = document.getElementById("barChart");
    if (ctxBar) {
        charts.bar = new Chart(ctxBar, {
            type: "bar",
            data: {
                labels: Object.keys(campanhaMap),
                datasets: [{
                    label: "Conversões",
                    data: Object.values(campanhaMap),
                    backgroundColor: "#3b82f6",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: "#94a3b8" } } },
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "#f1f5f9" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { color: "#f1f5f9" }, beginAtZero: true }
                }
            }
        });
    }
}

function setLoadingState(isLoading) {
    const els = ["timelineChart", "barChart"];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const wrapper = el.parentElement;
        let overlay = wrapper.querySelector("._chart-loading");

        if (isLoading) {
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.className = "_chart-loading";
                overlay.style.cssText = `
                    position:absolute; inset:0; display:flex; align-items:center;
                    justify-content:center; background:rgba(255,255,255,0.8);
                    border-radius:8px; font-size:13px; color:#94a3b8; font-family:'Inter',sans-serif;
                `;
                overlay.textContent = "A carregar...";
                wrapper.style.position = "relative";
                wrapper.appendChild(overlay);
            }
        } else {
            if (overlay) overlay.remove();
        }
    });
}

function showDashboardError(msg) {
    const container = document.getElementById("dashboard-error") || (() => {
        const el = document.createElement("div");
        el.id = "dashboard-error";
        el.style.cssText = `
            margin: 16px 0; padding: 12px 16px; border-radius: 8px;
            background: #fef2f2; border: 1px solid #fecaca;
            color: #dc2626; font-size: 13px; font-family: 'Inter', sans-serif;
        `;
        const charts = document.getElementById("timelineChart");
        if (charts) charts.closest(".card")?.before(el);
        return el;
    })();
    container.textContent = msg;
    container.style.display = "block";
}