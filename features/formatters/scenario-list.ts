// Cucumber formatter that prints one line per acceptance test, grouped by
// feature file, so the output shows which story and scenario each test
// checks (used for the acceptance test video, T045):
//
//   Feature: Browse Clubs (ID_008_Browse_Clubs.feature)
//     ✔ ID_008_Browse the list of clubs as a logged-in user (Normal Flow)
//     ✔ ID_008_Browse the list of clubs with a different role (Alternate Flow) [example 1/2]
//
// The summary formatter it extends then prints the failures and the totals.

import { SummaryFormatter, Status, formatterHelpers, type IFormatterOptions } from '@cucumber/cucumber';

const { getGherkinScenarioMap } = formatterHelpers.GherkinDocumentParser;

interface Envelope {
  testCaseFinished?: { testCaseStartedId: string; willBeRetried: boolean };
}

export default class ScenarioListFormatter extends SummaryFormatter {
  static readonly documentation = 'Prints one line per scenario, grouped by feature, then the summary';

  private currentUri: string | undefined;

  constructor(options: IFormatterOptions) {
    super(options);
    options.eventBroadcaster.on('envelope', (envelope: Envelope) => {
      const finished = envelope.testCaseFinished;
      if (finished && !finished.willBeRetried) this.logTestCase(finished.testCaseStartedId);
    });
  }

  // Blank line between the scenario list and the failures/totals.
  logSummary(...args: Parameters<SummaryFormatter['logSummary']>) {
    this.log('\n');
    super.logSummary(...args);
  }

  private logTestCase(testCaseStartedId: string) {
    const { gherkinDocument, pickle, worstTestStepResult } =
      this.eventDataCollector.getTestCaseAttempt(testCaseStartedId);

    if (gherkinDocument.uri !== this.currentUri) {
      this.currentUri = gherkinDocument.uri;
      this.log(`\nFeature: ${gherkinDocument.feature?.name} (${gherkinDocument.uri})\n`);
    }

    // A Scenario Outline runs once per example row: astNodeIds is
    // [scenario id, example row id].
    let example = '';
    const [scenarioId, rowId] = pickle.astNodeIds;
    if (rowId) {
      const rows = getGherkinScenarioMap(gherkinDocument)[scenarioId].examples.flatMap(
        (examples) => examples.tableBody,
      );
      example = ` [example ${rows.findIndex((row) => row.id === rowId) + 1}/${rows.length}]`;
    }

    const { status } = worstTestStepResult;
    const mark = status === Status.PASSED ? '✔' : '✖';
    this.log(`  ${this.colorFns.forStatus(status)(`${mark} ${pickle.name}${example}`)}\n`);
  }
}
