# Deploying

If you would like to run your own instance of this plugin, see the [docs for deploying plugins](https://github.com/probot/probot/blob/master/docs/deployment.md).

This plugin requires these **Permissions & events** for the GitHub App:

- Issues - **Read & Write**
  - [x] Check the box for **Issues** events
- Pull requests - **Read & Write**
  - [x] Check the box for **Pull request** events
- Single File - **Read-only**
  - Path: `.github/gitpod.yml`

## Now

- Run now to deploy, replacing the APP_ID and WEBHOOK_SECRET with the values for those variables, and setting the PRIVATE_KEY_BASE64:

        now -e APP_ID=aaa \
            -e WEBHOOK_SECRET=bbb \
            -e PRIVATE_KEY_BASE64="$(cat *.private-key.pem | base64)"

- Remove an old deployment

         now scale your-old-generated-url.now.sh 0
         now alias rm your-alias

- Swap to a new deployment

        now alias set your-generated-url.now.sh your-alias