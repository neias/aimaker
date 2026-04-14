import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks')
export class GitHubWebhookController {
  private readonly logger = new Logger(GitHubWebhookController.name);

  @Post('github')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleGitHubWebhook(
    @Headers('x-github-event') event: string,
    @Body() payload: Record<string, unknown>,
  ) {
    this.logger.log(`GitHub webhook received: ${event}`);

    switch (event) {
      case 'issues':
        await this.handleIssueEvent(payload);
        break;
      case 'pull_request':
        await this.handlePREvent(payload);
        break;
      default:
        this.logger.debug(`Unhandled GitHub event: ${event}`);
    }

    return { received: true };
  }

  private async handleIssueEvent(payload: Record<string, unknown>) {
    const action = payload.action as string;
    this.logger.log(`Issue ${action}: ${(payload.issue as Record<string, unknown>)?.title}`);
    // TODO: Auto-sync issue to database
  }

  private async handlePREvent(payload: Record<string, unknown>) {
    const action = payload.action as string;
    this.logger.log(`PR ${action}: ${(payload.pull_request as Record<string, unknown>)?.title}`);
  }
}
