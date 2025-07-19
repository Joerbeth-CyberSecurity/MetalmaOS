import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const projectUrl = Deno.env.get("PROJECT_URL");
    const anonKey = Deno.env.get("ANON_KEY");
    
    // Verificar se é exclusão
    if (body.action === 'delete' && body.user_id) {
      // EXCLUSÃO DE USUÁRIO
      const res = await fetch(`${projectUrl}/auth/v1/admin/users/${body.user_id}`, {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({
          error: data.message || "Erro ao excluir do Auth"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else if (body.action === 'update_password' && body.user_id && body.senha) {
      // ATUALIZAÇÃO DE SENHA
      const res = await fetch(`${projectUrl}/auth/v1/admin/users/${body.user_id}`, {
        method: "PUT",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: body.senha,
          email_confirm: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({
          error: data.message || "Erro ao atualizar senha"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else if (body.action === 'resend_email' && body.email) {
      // REENVIAR EMAIL DE RESET DE SENHA
      const res = await fetch(`${projectUrl}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: body.email
        })
      });

      if (!res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({
          error: data.message || "Erro ao reenviar email"
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      // CRIAÇÃO DE USUÁRIO (código original)
      const { email, nome, tipo_usuario, ativo, nivel_id } = body;
      
      // Cria o usuário no Auth
      const res = await fetch(`${projectUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          email_confirm: false,
          user_metadata: {
            nome
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({
          error: data.msg || data.error_description || data.error
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      // Enviar e-mail de recuperação de senha
      await fetch(`${projectUrl}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email
        })
      });
      
      // INSERIR NA TABELA ADMINS
      await fetch(`${projectUrl}/rest/v1/admins`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          {
            user_id: data.id || data.user?.id || 'temp-id',
            nome,
            email,
            tipo_usuario,
            ativo,
            nivel_id: nivel_id || null,
            senha_hash: '-'
          }
        ])
      });
      
      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Erro interno"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 