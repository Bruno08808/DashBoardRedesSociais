async function buildSidebar(currentPage, role) {
    const isAdmin = role === "admin";
    const navItems = [
        { href: "crescimento.html", label: "Crescimento", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` },
        { href: "campanhas.html",   label: "Campanhas",   icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
        { href: "posts.html",       label: "Posts",       icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>` },
        { href: "compare.html",     label: "Comparar",    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
        { href: "website.html",     label: "Website",     icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
        { href: "alertas.html",     label: "Alertas",     icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, badge: true },
        { href: "audit.html",       label: "Histórico",   icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`, adminOnly: true },
    ];

    // ── Badge de alertas com cache de 5 minutos ─────────────────
    // Evita 2 queries ao Supabase em cada navegação entre páginas
    const CACHE_KEY = 'admetrics_badge_cache';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em ms

    let alertCount = 0;
    try {
        // Tentar usar cache primeiro
        let useCache = false;
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
                alertCount = cached.count;
                useCache = true;
            }
        } catch(_) {}

        if (!useCache) {
            const today  = new Date(); today.setHours(0,0,0,0);
            const todayS = today.toISOString().split('T')[0];
            const in7    = new Date(today); in7.setDate(today.getDate()+7);
            const in7S   = in7.toISOString().split('T')[0];
            const ago30  = new Date(today); ago30.setDate(today.getDate()-30);
            const ago30S = ago30.toISOString().split('T')[0];

            let dismissed = new Set();
            try { dismissed = new Set(JSON.parse(localStorage.getItem('admetrics_dismissed') || '[]')); } catch(_) {}

            const [rCamp, rPosts] = await Promise.all([
                supabaseClient.from('campanhas')
                    .select('id')
                    .eq('status', 'Ativa')
                    .gte('data_fim', todayS)
                    .lte('data_fim', in7S)
                    .limit(50),  // máximo razoável de campanhas ativas
                supabaseClient.from('posts')
                    .select('id,likes_real,comentarios_real,partilhas_real,likes_objetivo,comentarios_objetivo,partilhas_objetivo')
                    .gte('data_publicacao', ago30S)
                    .lte('data_publicacao', todayS)
                    .limit(200)  // posts dos últimos 30 dias
            ]);

            (rCamp.data || []).forEach(c => {
                if (!dismissed.has('camp_'+c.id)) alertCount++;
            });
            (rPosts.data || []).forEach(p => {
                const oT = (p.likes_objetivo||0)+(p.comentarios_objetivo||0)+(p.partilhas_objetivo||0);
                const rT = (p.likes_real||0)+(p.comentarios_real||0)+(p.partilhas_real||0);
                if (oT > 0 && rT / oT < 0.3 && !dismissed.has('post_'+p.id)) alertCount++;
            });

            // Guardar em cache
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ count: alertCount, ts: Date.now() })); } catch(_) {}
        }
    } catch(_) {}

    const links = navItems.filter(item => !item.adminOnly || isAdmin).map(item => {
        const active = currentPage === item.href;
        const badgeHtml = (item.badge && alertCount > 0)
            ? `<span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}">${alertCount > 9 ? '9+' : alertCount}</span>`
            : '';
        return `<a href="${item.href}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                   ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}">
            ${item.icon}
            <span class="flex-1">${item.label}</span>
            ${badgeHtml}
        </a>`;
    }).join("");

    document.getElementById("sidebar-container").innerHTML = `
        <aside class="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
            <div class="px-6 py-5 border-b border-slate-100">
                <h1 class="text-lg font-bold tracking-tight text-slate-900">
                    AdMetrics<span class="text-blue-600">.io</span>
                </h1>
                <span class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                    ${isAdmin ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}">
                    ${isAdmin
                        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg> Admin`
                        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Visitor`}
                </span>
            </div>
            <nav class="flex-1 p-3 space-y-0.5">${links}</nav>
            <div class="p-3 border-t border-slate-100">
                <button onclick="logout()"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400
                           hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Terminar Sessão
                </button>
            </div>
        </aside>`;
}

// Limpar cache do badge quando o utilizador dismiss um alerta
// Chama isto no alertas.html após dismiss
function invalidarBadgeCache() {
    try { localStorage.removeItem('admetrics_badge_cache'); } catch(_) {}
}