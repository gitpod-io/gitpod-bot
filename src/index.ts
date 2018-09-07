import { Application, Context } from 'probot'
import { Response } from '@octokit/rest';

interface Label {
    name: string
}
interface Issue {
    locked: boolean,
    number: number,
    html_url: string,
    labels?: Label[]
}
interface PullRequestPayload {
    pull_request: Issue
}
interface IssuePayload {
    issue: Issue
}
type IssueSearchResponse = Response<{
    items: Issue[]
}>;
interface Scheduler {
    stop(repository: any): void;
}
interface GitpodConfig {
    pulls: {
        perform: boolean
        comment: string
    },
    issues: {
        perform: boolean,
        labels: Set<string>,
        comment: string
    }
}
type IssueKind = 'pulls' | 'issues';
type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends Set<infer U> ? RecursivePartial<U>[] :
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    T[P] extends object ? RecursivePartial<T[P]> :
    T[P];
};

const getConfig: (context: Context, fileName: string, defaultConfig?: object) => Promise<null | RecursivePartial<GitpodConfig>> = require('probot-config');
const createScheduler: (app: Application) => Scheduler = require('probot-scheduler');

interface GitpodStat {
    owner: string,
    repo: string,
    issues: number,
    pulls: number
}

class Gitpod {

    static async create(context: Context, scheduler: Scheduler, stats: Map<string, GitpodStat>): Promise<Gitpod> {
        const { owner, repo } = context.repo();
        const key = owner + '/' + repo;
        const stat = stats.get(key) || { owner, repo, issues: 0, pulls: 0 };
        stats.set(key, stat);

        const config = await getConfig(context, 'gitpod.yml');
        if (!config) {
            scheduler.stop(context.payload.repository);
        }

        const pulls = config && config.pulls;
        const issues = config && config.issues;
        return new Gitpod(context, {
            pulls: {
                perform: pulls && pulls.perform || false,
                comment: pulls && pulls.comment || ` - starts a development workspace for this pull request in code review mode and opens it in a browser IDE.`
            },
            issues: {
                perform: issues && issues.perform || false,
                comment: pulls && pulls.comment || ` - starts a development workspace with a preconfigured issue branch and opens it in a browser IDE.`,
                labels: new Set(issues && issues.labels || [])
            }
        }, stat);
    }

    constructor(
        protected readonly context: Context,
        protected readonly config: GitpodConfig,
        readonly stat: GitpodStat
    ) {
        context.log.debug('config: ' + JSON.stringify(config, (_, value) => {
            if (value instanceof Set) {
                return [...value.values()];
            }
            return value;
        }, 2));
    }

    async mark(kind: IssueKind, issue: Issue): Promise<void> {
        if (!this.config[kind].perform || issue.locked) {
            return;
        }
        if (!this.match(kind, issue)) {
            return;
        }
        const { github } = this.context;
        const { number, html_url } = issue;
        const body = `[Open in Gitpod](https://gitpod.io#${html_url})${this.config[kind].comment}`;
        const params = this.context.repo({ number, body });
        const id = `${params.owner}/${params.repo}#${params.number}`;
        this.context.log.debug(`Marking ${id}`);
        await github.issues.createComment(params);
        this.context.log.debug(`${id} has been marked`);
        this.stat[kind] = this.stat[kind] + 1;
    }

    match(kind: IssueKind, issue: Issue): boolean {
        if (!this.config[kind].perform || issue.locked) {
            return false;
        }
        if (kind === 'pulls') {
            return true;
        }
        const { labels } = this.config.issues;
        if (!issue.labels || !issue.labels.length || !labels.size) {
            return false;
        }
        return issue.labels.some(label => labels.has(label.name));
    }

    async markAll(kind: IssueKind): Promise<void> {
        if (!this.config[kind].perform) {
            return;
        }
        const query = this.createQuery(kind);
        if (kind === 'pulls') {
            await this.doMarkAll(kind, query);
            return;
        }
        for (const label of this.config.issues.labels) {
            await this.doMarkAll(kind, `${query} label:"${label}"`);
        }
    }

    protected async doMarkAll(kind: IssueKind, query: string): Promise<void> {
        const pages = await this.findIssues(query);
        for (const issues of pages) {
            for (const issue of issues) {
                await this.mark(kind, issue);
            }
        }
    }

    protected async findIssues(q: string): Promise<Issue[][]> {
        const { github } = this.context;
        const pages: Issue[][] = [];
        let response: IssueSearchResponse = await github.search.issues({ q, sort: 'updated', per_page: 100 });
        pages.push(response.data.items);
        while (github.hasNextPage(<any>response)) {
            response = await github.getNextPage(<any>response);
            pages.push(response.data.items);
        }
        return pages;
    }

    protected createQuery(kind: IssueKind): string {
        const { owner, repo } = this.context.repo();
        const type = kind === 'pulls' ? 'pr' : 'issue';
        return `NOT gitpod repo:${owner}/${repo} type:${type} is:open in:comments`;
    }

}

export = (app: Application) => {
    const scheduler = createScheduler(app);
    const stats = new Map<string, GitpodStat>();

    app.on('pull_request.opened', async context => {
        const gitpod = await Gitpod.create(context, scheduler, stats);
        const { pull_request } = <PullRequestPayload>context.payload;
        await gitpod.mark('pulls', pull_request);
    });

    app.on('issues.opened', async context => {
        const gitpod = await Gitpod.create(context, scheduler, stats);
        const { issue } = (<IssuePayload>context.payload);
        const { number } = issue;
        issue.labels = (await context.github.issues.getIssueLabels(context.repo({ number }))).data;
        await gitpod.mark('issues', issue);
    });

    app.on('schedule.repository', async context => {
        const gitpod = await Gitpod.create(context, scheduler, stats);
        await gitpod.markAll('pulls');
        await gitpod.markAll('issues');
        context.log.info(gitpod.stat);
    });

}
