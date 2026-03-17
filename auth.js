async function getUserProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return null; }
    const { data } = await supabaseClient.from("profiles").select("role, email").eq("id", user.id).single();
    return { user, role: data?.role || "viewer" };
}
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}