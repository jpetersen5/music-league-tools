import { useState } from 'react'
import { Alert } from '../common/Alert'
import { ValidationMessage } from '../common/ValidationMessage'
import { ValidationError, ValidationSeverity, CsvFileType } from '@/types/musicLeague'

/**
 * Test component to demonstrate Alert and ValidationMessage components
 * This can be imported into any page for testing purposes
 */
export function AlertTest() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const handleDismiss = (id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id))
  }

  // Sample validation errors
  const sampleErrors: ValidationError[] = [
    {
      severity: ValidationSeverity.Error,
      fileType: CsvFileType.Competitors,
      lineNumber: 15,
      column: 'ID',
      message: 'Competitor ID is required',
      value: '',
    },
    {
      severity: ValidationSeverity.Error,
      fileType: CsvFileType.Competitors,
      lineNumber: 23,
      column: 'Name',
      message: 'Competitor name is required',
      value: '',
    },
    {
      severity: ValidationSeverity.Error,
      fileType: CsvFileType.Submissions,
      lineNumber: 8,
      column: 'Spotify URI',
      message: 'Invalid Spotify URI format',
      value: 'spotify:invalid:uri',
    },
    {
      severity: ValidationSeverity.Warning,
      fileType: CsvFileType.Submissions,
      lineNumber: 42,
      column: 'Comment',
      message: 'Comment is very long (500+ characters)',
      value: 'This is a very long comment that exceeds the recommended character limit...',
    },
    {
      severity: ValidationSeverity.Warning,
      fileType: CsvFileType.Votes,
      lineNumber: 105,
      column: 'Points Assigned',
      message: 'Unusually high point value detected',
      value: '100',
    },
    {
      severity: ValidationSeverity.Info,
      fileType: CsvFileType.Rounds,
      lineNumber: 3,
      column: 'Description',
      message: 'Round description is empty',
      value: '',
    },
    {
      severity: ValidationSeverity.Info,
      fileType: CsvFileType.Submissions,
      lineNumber: 67,
      column: 'Visible To Voters',
      message: 'Submission is hidden from voters',
      value: 'No',
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Alert Component Test</h1>

      <section style={{ marginBottom: '48px' }}>
        <h2>Basic Alerts</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Non-dismissible alerts with different variants
        </p>

        {!dismissedAlerts.has('error-basic') && (
          <Alert variant="error" message="Something went wrong!" />
        )}

        {!dismissedAlerts.has('warning-basic') && (
          <Alert variant="warning" message="Please review your changes before proceeding" />
        )}

        {!dismissedAlerts.has('success-basic') && (
          <Alert variant="success" message="Profile uploaded successfully!" />
        )}

        {!dismissedAlerts.has('info-basic') && (
          <Alert variant="info" message="Did you know? You can upload multiple profiles" />
        )}
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Alerts with Titles</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Alerts with optional titles for emphasis
        </p>

        {!dismissedAlerts.has('error-title') && (
          <Alert
            variant="error"
            title="Upload Failed"
            message="The CSV file could not be parsed. Please check the format and try again."
          />
        )}

        {!dismissedAlerts.has('warning-title') && (
          <Alert
            variant="warning"
            title="Warning"
            message="This action cannot be undone. Are you sure you want to continue?"
          />
        )}

        {!dismissedAlerts.has('success-title') && (
          <Alert
            variant="success"
            title="Success!"
            message="Your Music League data has been imported and is ready to use."
          />
        )}

        {!dismissedAlerts.has('info-title') && (
          <Alert
            variant="info"
            title="Pro Tip"
            message="Use keyboard shortcuts to navigate faster. Press '?' to see all shortcuts."
          />
        )}
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Dismissible Alerts</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Alerts that can be dismissed by the user
        </p>

        {!dismissedAlerts.has('error-dismiss') && (
          <Alert
            variant="error"
            title="Error"
            message="Failed to connect to the database"
            dismissible
            onDismiss={() => handleDismiss('error-dismiss')}
          />
        )}

        {!dismissedAlerts.has('warning-dismiss') && (
          <Alert
            variant="warning"
            message="Your session will expire in 5 minutes"
            dismissible
            onDismiss={() => handleDismiss('warning-dismiss')}
          />
        )}

        {!dismissedAlerts.has('success-dismiss') && (
          <Alert
            variant="success"
            message="Settings saved successfully"
            dismissible
            onDismiss={() => handleDismiss('success-dismiss')}
          />
        )}

        {!dismissedAlerts.has('info-dismiss') && (
          <Alert
            variant="info"
            title="New Feature"
            message="We've added sentiment analysis to your comment data!"
            dismissible
            onDismiss={() => handleDismiss('info-dismiss')}
          />
        )}
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Validation Message Component</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Complex validation errors with grouping and collapsible sections
        </p>

        <ValidationMessage
          errors={sampleErrors}
          maxDisplay={10}
          showLineNumbers={true}
          collapsible={true}
          onRetry={() => {
            console.log('Retry clicked')
            alert('Retry upload functionality would trigger here')
          }}
        />
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Validation Message - Errors Only</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Only showing errors without warnings or info
        </p>

        <ValidationMessage
          errors={sampleErrors.filter(e => e.severity === ValidationSeverity.Error)}
          maxDisplay={5}
          showLineNumbers={true}
          collapsible={false}
        />
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Empty Validation Message</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          When there are no errors, nothing is rendered
        </p>

        <ValidationMessage errors={[]} />

        <Alert
          variant="success"
          title="No Errors"
          message="The ValidationMessage component with empty errors array renders nothing"
        />
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2>Validation Message - Many Errors</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Testing truncation when there are more than maxDisplay errors
        </p>

        <ValidationMessage
          errors={[
            ...Array.from({ length: 15 }, (_, i) => ({
              severity: ValidationSeverity.Error,
              fileType: CsvFileType.Competitors,
              lineNumber: i + 1,
              column: 'ID',
              message: `Error number ${i + 1}: Invalid ID format`,
              value: `invalid_id_${i}`,
            })),
            ...Array.from({ length: 8 }, (_, i) => ({
              severity: ValidationSeverity.Warning,
              fileType: CsvFileType.Submissions,
              lineNumber: i + 1,
              column: 'Comment',
              message: `Warning number ${i + 1}: Comment is empty`,
              value: '',
            })),
          ]}
          maxDisplay={5}
          showLineNumbers={true}
          collapsible={true}
        />
      </section>

      <section>
        <h2>Custom Styling</h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Alerts with custom CSS classes
        </p>

        <Alert
          variant="info"
          message="This alert has custom styling via className prop"
          className="custom-alert"
        />

        <style>{`
          .custom-alert {
            border-radius: 16px;
            border-width: 2px;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          }
        `}</style>
      </section>
    </div>
  )
}
