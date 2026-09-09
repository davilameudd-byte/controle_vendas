# Mala Mia — site + gestão

Este repositório tem duas partes:

- `/index.html` — site de vendas público (catálogo + WhatsApp)
- `/gestao/` — painel de gestão interno (compras, vendas, revendedoras, estoque, comissões), protegido por login

## 1. Publicar no GitHub Pages

```bash
# dentro da pasta do projeto
git init
git add .
git commit -m "Site Mala Mia + painel de gestão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/mala-mia.git
git push -u origin main
```

Depois, no GitHub: **Settings → Pages → Branch: main / (root) → Save**.
Em alguns minutos o site fica em `https://SEU_USUARIO.github.io/mala-mia/`
e o painel em `https://SEU_USUARIO.github.io/mala-mia/gestao/`.

## 2. Configurar o WhatsApp do site de vendas

Abra `index.html`, procure a linha:

```js
const WHATSAPP_NUMERO = "5521999999999";
```

e troque pelo seu número real (DDI 55 + DDD + número, só dígitos, sem espaço/traço).

## 3. Configurar a sincronização do painel de gestão (Firebase — grátis)

O painel precisa de um "banco de dados" para sincronizar entre celular e computador.
Vamos usar o **Firebase** (do Google), plano gratuito, mais que suficiente para isso.

1. Acesse **console.firebase.google.com** e crie um projeto novo (ex.: `mala-mia`).
2. No menu do projeto, clique no ícone **`</>`** (Adicionar app da Web), dê um nome
   e copie o objeto `firebaseConfig` que aparece (apiKey, authDomain, projectId, etc.).
3. Abra `gestao/app.jsx` e cole esses valores no topo do arquivo, substituindo:
   ```js
   const firebaseConfig = {
     apiKey: "COLE_AQUI_SUA_API_KEY",
     authDomain: "SEU_PROJETO.firebaseapp.com",
     projectId: "SEU_PROJETO",
     storageBucket: "SEU_PROJETO.appspot.com",
     messagingSenderId: "000000000000",
     appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
   };
   ```
4. No menu lateral do Firebase, vá em **Build → Authentication → Sign-in method**
   e habilite **E-mail/senha**.
5. Ainda em Authentication, aba **Users**, clique **Add user** e crie o login que
   a gestora vai usar para entrar no painel (e-mail + senha).
6. Vá em **Build → Firestore Database → Create database** (modo produção, região
   `southamerica-east1` se disponível).
7. Na aba **Regras** do Firestore, cole:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   Isso garante que só quem faz login (passo 5) consegue ler/gravar os dados —
   ninguém de fora acessa, mesmo o painel sendo uma página pública.
8. Publique (passo 1). Pronto: qualquer dispositivo que entrar em
   `.../gestao/` com o e-mail/senha criado vê os mesmos dados, em tempo real.

> Sem esses passos o painel abre, mas mostra erro ao tentar entrar — é
> exatamente por faltar o `firebaseConfig` e o usuário criado no Firebase.

## 3.1. Adicionar mais pessoas (ex.: a gestora e você)

Repita o passo 5 para cada pessoa que vai usar o painel — cada uma com seu
próprio e-mail/senha.

## 4. Editar o catálogo do site de vendas

Cada perfume é um bloco `<div class="card">…</div>` dentro de
`<section id="perfumes">` no `index.html`. Copie um bloco, troque nome, nota,
preço e o `data-wa="Nome do produto"` (isso preenche a mensagem do WhatsApp
automaticamente). As "garrafas" são desenhos simples em SVG — pode trocar por
fotos reais dos produtos quando tiver (`<img src="fotos/produto1.jpg">` no
lugar do `<svg class="bottle">…</svg>`).
