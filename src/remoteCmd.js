const { exec } = require('child_process');
const { githubWorkspace, remotePort, sshServer } = require('./inputs');
const { writeToFile } = require('./helpers');

const handleError = (message, isRequired, callback) => {
  if (isRequired) {
    callback(new Error(message));
  } else {
    console.warn(message);
  }
};

// eslint-disable-next-line max-len
const remoteCmd = async (content, privateKeyPath, isRequired, label, sshCmdArgs) => new Promise((resolve, reject) => {
  const filename = `local_ssh_script-${label}.sh`;
  try {
    writeToFile({ dir: githubWorkspace, filename, content });
    const dataLimit = 10000;
    const rsyncStdout = (process.env.RSYNC_STDOUT || '').substring(0, dataLimit);
    console.log(`Executing remote script: ssh -p ${(remotePort || 22)} -i ${privateKeyPath} ${(sshCmdArgs)} ${sshServer} 'RSYNC_STDOUT="${rsyncStdout}" bash -s' < ${filename}`);
    exec(
      `DEBIAN_FRONTEND=noninteractive ssh -p ${(remotePort || 22)} -i ${privateKeyPath} ${(sshCmdArgs || '-o HostKeyAlgorithms=+ssh-dss -o PubkeyAcceptedAlgorithms=+ssh-rsa -o StrictHostKeyChecking=no')} ${sshServer} 'RSYNC_STDOUT="${rsyncStdout}" bash -s' < ${filename}`,
      (err, data = '', stderr = '') => {
        if (err) {
          const message = `⚠️ [CMD] Remote script failed in cmd_${label}: ${err.message}`;
          console.warn(`${message} \n`, data, stderr);
          handleError(message, isRequired, reject);
        } else {
          const limited = data.substring(0, dataLimit);
          console.log(`✅ [CMD] Remote script cmd_${label} executed. \n`, limited, stderr);
          resolve(limited);
        }
      }
    );
  } catch (err) {
    handleError(err.message, isRequired, reject);
  }
});

module.exports = {
  remoteCmdBefore: async (cmd, privateKeyPath, isRequired, sshCmdArgs) => remoteCmd(cmd, privateKeyPath, isRequired, 'before', sshCmdArgs),
  remoteCmdAfter: async (cmd, privateKeyPath, isRequired, sshCmdArgs) => remoteCmd(cmd, privateKeyPath, isRequired, 'after', sshCmdArgs)
};
