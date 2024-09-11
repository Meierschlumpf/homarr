import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const downloadsJob = createCronJob("downloads", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["downloads"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const integrationInstance = integrationCreatorFromSecrets(integration);
      await integrationInstance
        .getClientJobsAndStatusAsync()
        .then(async (data) => {
          const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integration.id);
          await channel.publishAndUpdateLastStateAsync(data);
        })
        .catch((error) => console.error(`Could not retrieve data for ${integration.name}: "${error}"`));
    }
  }
});