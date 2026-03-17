async function salvarCampanha() {
    const profile = await getUserProfile();

    if (profile.role !== "admin") {
        showToast("Apenas admin pode criar campanhas", true);
        return;
    }

    const nome      = document.getElementById("cam_nome").value;
    const plataforma = document.getElementById("cam_plataforma").value;
    const material  = document.getElementById("cam_material").value;

    const { data, error } = await supabaseClient
        .from("campanhas")
        .insert([{ nome, plataforma, material }])
        .select();

    if (error) {
        showToast(error.message, true);
        return;
    }

    showToast("Campanha criada com sucesso!");
    setTimeout(() => location.reload(), 1200);
}

// Toast global — funciona em qualquer página que inclua este ficheiro
function showToast(message, isError = false) {
    const existing = document.getElementById("_toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "_toast";
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 500;
        font-family: 'Inter', sans-serif; z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        background: ${isError ? "#fef2f2" : "#f0fdf4"};
        color: ${isError ? "#dc2626" : "#16a34a"};
        border: 1px solid ${isError ? "#fecaca" : "#bbf7d0"};
        animation: _toastIn 0.2s ease;
    `;

    const style = document.createElement("style");
    style.textContent = `@keyframes _toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}