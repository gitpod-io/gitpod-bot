# gitpod-bot

[Gitpod](http://www.gitpod.io) is a one-click online IDE for GitHub. It can be started on any GitHub URL by prefixing it with `gitpod.io#`. Gitpod Bot generates such links for issues and pull requests and post them as comments.

<img src="https://user-images.githubusercontent.com/3082655/45426649-1a2bd100-b69d-11e8-9790-91cd6850bc63.png" height="512px" />

## Setup

```sh
# Install dependencies
npm install

# Run typescript
npm run build

# Run the bot
npm start
```

## Usage

1. **[Configure the GitHub App](https://github.com/apps/gitpod-io)**
2. Create `.github/gitpod.yml` based on the following template.
3. It will start scanning for issues and/or pull requests within an hour.

A `.github/gitpod.yml` file is required to enable the plugin. The file can be empty, or it can override any of these default settings:

```yml
pulls:
# Enable for pull requests
  perform: true
# Customize a comment to post on a pull request. Comment out to use the default
#  comment:

issues:
# enable for issues
  perform: true
# issues with these labels will be considered. Set to `[]` to disable for issues
  labels:
    - help wanted
    - good first issue
# Customize a comment to post on an issue. Comment out to use the default
#  comment:
```

## Deployment

See [doc/Deploying.md](doc/Deploying.md) if you would like to run your own instance of this plugin.

## Contributing

If you have suggestions for how gitpod-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2018 TypeFox <contact@typefox.io> (http://typefox.io)
