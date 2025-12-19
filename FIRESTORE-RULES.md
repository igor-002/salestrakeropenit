# Configuração das Regras do Firestore

## ⚠️ IMPORTANTE: Configure as regras do Firestore para acesso público

Para que o sistema funcione sem autenticação e os dados apareçam em todos os navegadores, você precisa configurar as regras do Firestore no Firebase Console.

## 📝 Regras Necessárias

Acesse o Firebase Console → Firestore Database → Rules e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita pública para todos os dados
    match /artifacts/{appId}/public/data/{collection}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🔧 Passos para Configurar

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em **Firestore Database** no menu lateral
4. Clique na aba **Rules** (Regras)
5. Cole as regras acima
6. Clique em **Publish** (Publicar)

## ✅ O que isso resolve

- ✅ Dados acessíveis em qualquer navegador/dispositivo
- ✅ Sem necessidade de login/autenticação
- ✅ Sistema funciona como TV Dashboard público
- ✅ Todos veem os mesmos dados em tempo real

## ⚠️ Segurança

**ATENÇÃO**: Essas regras tornam seus dados **completamente públicos**. Use apenas se:
- É um dashboard de TV interno
- Os dados não são sensíveis
- Você confia no ambiente onde será usado

Para produção com dados sensíveis, considere implementar autenticação adequada.
