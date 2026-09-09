// scripts/create-admin.js
// Script auxiliar de linha de comando: gera o hash bcrypt da senha do admin
// e uma SESSION_SECRET aleatoria, para voce colar no arquivo .env.
// Rode com:  npm run create-admin

const readline = require('readline');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);

    let input = '';
    const onData = (char) => {
      char = char.toString('utf8');
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      if (char === '\u0003') { // Ctrl+C
        process.exit(1);
      }
      if (char === '\u007f') { // backspace
        input = input.slice(0, -1);
        return;
      }
      input += char;
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('=== Geracao de credenciais do administrador ===\n');

  const username = await new Promise((resolve) => {
    rl.question('Nome de usuario do admin (ex: admin): ', resolve);
  });

  const password = await askHidden('Senha do admin (nao sera exibida): ');
  const passwordConfirm = await askHidden('Confirme a senha: ');

  if (password !== passwordConfirm) {
    console.error('\nAs senhas nao coincidem. Rode o script novamente.');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('\nUse uma senha com pelo menos 10 caracteres.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const sessionSecret = crypto.randomBytes(48).toString('hex');

  console.log('\n=== Copie estas linhas para o seu arquivo .env ===\n');
  console.log(`ADMIN_USERNAME=${username}`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`SESSION_SECRET=${sessionSecret}`);
  console.log('\nGuarde a senha em texto puro em um local seguro (ex: gerenciador de senhas).');
  console.log('O hash acima e o unico registro dela no servidor -- a senha original nao e recuperavel a partir dele.\n');

  rl.close();
  process.exit(0);
}

main();
