
// =============================================================================
// VALIDATION PROTOCOL GENERATOR SERVICE
// =============================================================================
// Generates IQ/OQ/PQ validation protocols from templates per GAMP 5 guidelines.
// =============================================================================

import {
  ValidationProtocol,
  ProtocolType,
  ProtocolSection,
  TestCase,
  TestStep,
  TestCategory,
  Approval,
  ApprovalRole,
  ProtocolGenerationOptions,
  IQTemplateConfig,
  OQTemplateConfig,
  PQTemplateConfig,
  TestCaseTemplate,
  SystemInfo,
  RiskLevel,
  generateProtocolNumber,
} from '@/types/validation-protocol';

// Re-export types needed by consumers
export type { ProtocolGenerationOptions } from '@/types/validation-protocol';

// ============================================================================
// PROTOCOL SECTION TEMPLATES
// ============================================================================

const COMMON_SECTIONS: ProtocolSection[] = [
  {
    id: 'purpose',
    number: '1.0',
    title: 'Purpose',
    content: 'This protocol defines the qualification activities to be performed to verify that {{SYSTEM_NAME}} has been properly {{QUALIFICATION_TYPE}} and meets all specified requirements.',
    required: true,
  },
  {
    id: 'scope',
    number: '2.0',
    title: 'Scope',
    content: 'This protocol applies to {{SYSTEM_NAME}} version {{SYSTEM_VERSION}} deployed in the {{ENVIRONMENT}} environment. The system is classified as GAMP Category {{GAMP_CATEGORY}} ({{GAMP_DESCRIPTION}}).',
    required: true,
  },
  {
    id: 'responsibilities',
    number: '3.0',
    title: 'Responsibilities',
    content: `### 3.1 System Owner
- Overall accountability for system validation
- Review and approval of protocol and results

### 3.2 Validation Lead
- Protocol preparation and execution oversight
- Deviation management
- Final summary report preparation

### 3.3 Quality Assurance
- Protocol review and approval
- Deviation review
- Final approval of validation package

### 3.4 IT/Technical Support
- Technical execution support
- Environment verification
- Configuration documentation`,
    required: true,
  },
  {
    id: 'references',
    number: '4.0',
    title: 'References',
    content: `### 4.1 Regulatory References
- 21 CFR Part 11 - Electronic Records; Electronic Signatures
- EU Annex 11 - Computerised Systems
- GAMP 5 - A Risk-Based Approach to Compliant GxP Computerized Systems

### 4.2 Internal References
- CSV Master Validation Plan
- System Requirements Specification (SRS)
- Functional Specification (FS)
- Design Specification (DS)`,
    required: true,
  },
  {
    id: 'definitions',
    number: '5.0',
    title: 'Definitions',
    content: `| Term | Definition |
|------|------------|
| IQ | Installation Qualification - Documented verification that equipment/system has been installed according to specifications |
| OQ | Operational Qualification - Documented verification that equipment/system operates according to specifications |
| PQ | Performance Qualification - Documented verification that equipment/system performs consistently as intended |
| CSV | Computer System Validation |
| GAMP | Good Automated Manufacturing Practice |
| URS | User Requirements Specification |
| FS | Functional Specification |`,
    required: true,
  },
  {
    id: 'prerequisites',
    number: '6.0',
    title: 'Prerequisites',
    content: 'The following prerequisites must be met before protocol execution:\n\n{{PREREQUISITES}}',
    required: true,
  },
  {
    id: 'execution',
    number: '7.0',
    title: 'Test Execution',
    content: `### 7.1 Execution Guidelines
- All tests must be executed in the order specified
- Each test step must be documented with actual results
- Screenshots and evidence must be captured as specified
- Any deviation from expected results must be documented immediately
- Do not proceed past a failed critical test without deviation review

### 7.2 Documentation Requirements
- Record actual results for each test step
- Capture date, time, and tester initials
- Attach all required evidence
- Document any observations or issues`,
    required: true,
  },
];

const IQ_SPECIFIC_SECTIONS: ProtocolSection[] = [
  {
    id: 'iq-overview',
    number: '8.0',
    title: 'Installation Qualification Overview',
    content: `This Installation Qualification (IQ) verifies that {{SYSTEM_NAME}} has been installed correctly according to vendor specifications and organizational requirements.

### 8.1 IQ Objectives
- Verify hardware components are installed per specifications
- Verify software is installed with correct version and configuration
- Verify network connectivity and integration points
- Verify all required documentation is available
- Verify environment meets system requirements`,
    required: true,
  },
];

const OQ_SPECIFIC_SECTIONS: ProtocolSection[] = [
  {
    id: 'oq-overview',
    number: '8.0',
    title: 'Operational Qualification Overview',
    content: `This Operational Qualification (OQ) verifies that {{SYSTEM_NAME}} operates according to its functional specifications across all specified operating ranges.

### 8.1 OQ Objectives
- Verify all specified functions operate correctly
- Verify security controls are effective
- Verify error handling and recovery procedures
- Verify audit trail functionality (21 CFR Part 11)
- Verify electronic signature functionality (if applicable)
- Verify boundary conditions and edge cases`,
    required: true,
  },
];

const PQ_SPECIFIC_SECTIONS: ProtocolSection[] = [
  {
    id: 'pq-overview',
    number: '8.0',
    title: 'Performance Qualification Overview',
    content: `This Performance Qualification (PQ) verifies that {{SYSTEM_NAME}} consistently performs as intended in the actual operating environment using real-world scenarios.

### 8.1 PQ Objectives
- Verify end-to-end business workflows
- Verify system performance under expected load
- Verify user acceptance criteria are met
- Verify integration with connected systems
- Verify system meets business process requirements`,
    required: true,
  },
];

// ============================================================================
// TEST CASE TEMPLATES
// ============================================================================

const IQ_TEST_TEMPLATES: TestCaseTemplate[] = [
  {
    id: 'iq-hw-001',
    category: 'hardware_verification',
    titleTemplate: 'Verify Server Hardware Configuration',
    objectiveTemplate: 'Confirm that the server hardware meets the minimum specifications for {{SYSTEM_NAME}}',
    defaultSteps: [
      { stepNumber: 1, action: 'Access server management console or system information', expectedResult: 'System information is accessible' },
      { stepNumber: 2, action: 'Verify CPU type and count meets specifications', expectedResult: 'CPU meets or exceeds minimum requirements' },
      { stepNumber: 3, action: 'Verify RAM amount meets specifications', expectedResult: 'RAM meets or exceeds minimum requirements' },
      { stepNumber: 4, action: 'Verify storage capacity and type', expectedResult: 'Storage meets or exceeds minimum requirements' },
      { stepNumber: 5, action: 'Document hardware configuration in evidence', expectedResult: 'Configuration documented with screenshots' },
    ],
    expectedResultsTemplate: 'Server hardware configuration meets or exceeds all specified requirements',
    acceptanceCriteriaTemplate: 'All hardware specifications verified and documented',
    defaultRiskLevel: 'medium',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'iq-sw-001',
    category: 'software_installation',
    titleTemplate: 'Verify Application Software Installation',
    objectiveTemplate: 'Confirm that {{SYSTEM_NAME}} version {{SYSTEM_VERSION}} is correctly installed',
    defaultSteps: [
      { stepNumber: 1, action: 'Navigate to application installation directory', expectedResult: 'Installation directory exists with expected structure' },
      { stepNumber: 2, action: 'Verify application version number', expectedResult: 'Version displays as {{SYSTEM_VERSION}}' },
      { stepNumber: 3, action: 'Verify all required components are installed', expectedResult: 'All components present and accessible' },
      { stepNumber: 4, action: 'Verify application starts without errors', expectedResult: 'Application launches successfully' },
      { stepNumber: 5, action: 'Capture screenshots of version and installation', expectedResult: 'Evidence captured and attached' },
    ],
    expectedResultsTemplate: '{{SYSTEM_NAME}} version {{SYSTEM_VERSION}} is correctly installed and launches successfully',
    acceptanceCriteriaTemplate: 'Correct version installed with all components',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME', 'SYSTEM_VERSION'],
  },
  {
    id: 'iq-sw-002',
    category: 'software_installation',
    titleTemplate: 'Verify Database Installation and Configuration',
    objectiveTemplate: 'Confirm that the database for {{SYSTEM_NAME}} is correctly installed and configured',
    defaultSteps: [
      { stepNumber: 1, action: 'Connect to database server', expectedResult: 'Connection established successfully' },
      { stepNumber: 2, action: 'Verify database version', expectedResult: 'Database version matches specifications' },
      { stepNumber: 3, action: 'Verify database schema is created', expectedResult: 'All required tables and objects exist' },
      { stepNumber: 4, action: 'Verify database user permissions', expectedResult: 'Application user has correct permissions' },
      { stepNumber: 5, action: 'Verify backup configuration', expectedResult: 'Backup jobs configured and scheduled' },
    ],
    expectedResultsTemplate: 'Database is correctly installed, configured, and accessible',
    acceptanceCriteriaTemplate: 'Database operational with correct configuration',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'iq-net-001',
    category: 'network_configuration',
    titleTemplate: 'Verify Network Connectivity',
    objectiveTemplate: 'Confirm network connectivity for {{SYSTEM_NAME}} in {{ENVIRONMENT}} environment',
    defaultSteps: [
      { stepNumber: 1, action: 'Verify server IP address and hostname', expectedResult: 'IP and hostname match documentation' },
      { stepNumber: 2, action: 'Verify DNS resolution', expectedResult: 'Hostname resolves correctly' },
      { stepNumber: 3, action: 'Verify firewall rules allow required traffic', expectedResult: 'Required ports are accessible' },
      { stepNumber: 4, action: 'Verify connectivity to dependent systems', expectedResult: 'All integration points accessible' },
      { stepNumber: 5, action: 'Verify SSL/TLS certificate if applicable', expectedResult: 'Certificate valid and trusted' },
    ],
    expectedResultsTemplate: 'Network connectivity verified for all required endpoints',
    acceptanceCriteriaTemplate: 'All network connections functional',
    defaultRiskLevel: 'medium',
    variables: ['SYSTEM_NAME', 'ENVIRONMENT'],
  },
  {
    id: 'iq-doc-001',
    category: 'documentation_review',
    titleTemplate: 'Verify Installation Documentation',
    objectiveTemplate: 'Confirm all required installation documentation is available for {{SYSTEM_NAME}}',
    defaultSteps: [
      { stepNumber: 1, action: 'Verify Installation Guide availability', expectedResult: 'Installation Guide present and current' },
      { stepNumber: 2, action: 'Verify System Requirements document', expectedResult: 'System Requirements documented' },
      { stepNumber: 3, action: 'Verify Configuration documentation', expectedResult: 'Configuration settings documented' },
      { stepNumber: 4, action: 'Verify Release Notes for installed version', expectedResult: 'Release Notes available' },
      { stepNumber: 5, action: 'Verify Vendor Support documentation', expectedResult: 'Support contacts documented' },
    ],
    expectedResultsTemplate: 'All required installation documentation is available and current',
    acceptanceCriteriaTemplate: 'Complete documentation package verified',
    defaultRiskLevel: 'low',
    variables: ['SYSTEM_NAME'],
  },
];

const OQ_TEST_TEMPLATES: TestCaseTemplate[] = [
  {
    id: 'oq-func-001',
    category: 'functional_testing',
    titleTemplate: 'Verify User Login Functionality',
    objectiveTemplate: 'Confirm users can successfully authenticate to {{SYSTEM_NAME}}',
    defaultSteps: [
      { stepNumber: 1, action: 'Navigate to login page', expectedResult: 'Login page displays correctly' },
      { stepNumber: 2, action: 'Enter valid username and password', expectedResult: 'Credentials accepted' },
      { stepNumber: 3, action: 'Click Login button', expectedResult: 'User authenticated and redirected to home page' },
      { stepNumber: 4, action: 'Verify user session is established', expectedResult: 'User name displays in application' },
      { stepNumber: 5, action: 'Log out and verify session ends', expectedResult: 'User logged out, redirected to login' },
    ],
    expectedResultsTemplate: 'User authentication functions correctly',
    acceptanceCriteriaTemplate: 'Valid users can login and logout successfully',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'oq-sec-001',
    category: 'security_testing',
    titleTemplate: 'Verify Failed Login Handling',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} correctly handles invalid login attempts',
    defaultSteps: [
      { stepNumber: 1, action: 'Attempt login with invalid username', expectedResult: 'Login rejected with appropriate message' },
      { stepNumber: 2, action: 'Attempt login with invalid password', expectedResult: 'Login rejected with appropriate message' },
      { stepNumber: 3, action: 'Attempt multiple failed logins (per lockout policy)', expectedResult: 'Account locked after threshold' },
      { stepNumber: 4, action: 'Verify lockout is recorded in audit log', expectedResult: 'Failed attempts logged' },
      { stepNumber: 5, action: 'Verify account unlock procedure', expectedResult: 'Account can be unlocked per procedure' },
    ],
    expectedResultsTemplate: 'Invalid login attempts are rejected and account lockout functions correctly',
    acceptanceCriteriaTemplate: 'Security controls for authentication are effective',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'oq-sec-002',
    category: 'security_testing',
    titleTemplate: 'Verify Role-Based Access Control',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} enforces role-based access permissions',
    defaultSteps: [
      { stepNumber: 1, action: 'Login as user with limited role', expectedResult: 'User authenticated' },
      { stepNumber: 2, action: 'Attempt to access restricted function', expectedResult: 'Access denied with appropriate message' },
      { stepNumber: 3, action: 'Login as user with full access', expectedResult: 'User authenticated' },
      { stepNumber: 4, action: 'Access same restricted function', expectedResult: 'Access granted' },
      { stepNumber: 5, action: 'Verify access attempts are logged', expectedResult: 'Access events recorded in audit trail' },
    ],
    expectedResultsTemplate: 'Role-based access control is enforced correctly',
    acceptanceCriteriaTemplate: 'Users can only access functions permitted by their role',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'oq-audit-001',
    category: 'audit_trail_testing',
    titleTemplate: 'Verify Audit Trail Captures Required Events',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} audit trail meets 21 CFR Part 11 requirements',
    defaultSteps: [
      { stepNumber: 1, action: 'Perform a create action on GxP data', expectedResult: 'Record created successfully' },
      { stepNumber: 2, action: 'Review audit trail for create event', expectedResult: 'Audit entry shows who, what, when for create' },
      { stepNumber: 3, action: 'Perform an update action on GxP data', expectedResult: 'Record updated successfully' },
      { stepNumber: 4, action: 'Review audit trail for update event', expectedResult: 'Audit entry shows old value, new value, who, when' },
      { stepNumber: 5, action: 'Verify audit trail cannot be modified', expectedResult: 'Audit entries are read-only' },
    ],
    expectedResultsTemplate: 'Audit trail captures all required events with complete metadata',
    acceptanceCriteriaTemplate: 'Audit trail meets 21 CFR Part 11 requirements',
    defaultRiskLevel: 'critical',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'oq-esig-001',
    category: 'electronic_signature',
    titleTemplate: 'Verify Electronic Signature Functionality',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} electronic signatures meet 21 CFR Part 11 requirements',
    defaultSteps: [
      { stepNumber: 1, action: 'Navigate to record requiring signature', expectedResult: 'Record displays with signature option' },
      { stepNumber: 2, action: 'Initiate electronic signature', expectedResult: 'Signature prompt displays' },
      { stepNumber: 3, action: 'Enter credentials and signature meaning', expectedResult: 'Signature accepted' },
      { stepNumber: 4, action: 'Verify signature details are recorded', expectedResult: 'Signature shows name, date/time, meaning' },
      { stepNumber: 5, action: 'Verify signed record is locked', expectedResult: 'Signed record cannot be modified' },
    ],
    expectedResultsTemplate: 'Electronic signatures function per 21 CFR Part 11 requirements',
    acceptanceCriteriaTemplate: 'Electronic signatures are non-repudiable and record is locked',
    defaultRiskLevel: 'critical',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'oq-err-001',
    category: 'error_handling',
    titleTemplate: 'Verify Error Message Display',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} displays appropriate error messages',
    defaultSteps: [
      { stepNumber: 1, action: 'Trigger a validation error (e.g., required field)', expectedResult: 'Validation error message displays' },
      { stepNumber: 2, action: 'Verify error message is user-friendly', expectedResult: 'Message clearly describes issue and resolution' },
      { stepNumber: 3, action: 'Trigger a system error condition', expectedResult: 'System error handled gracefully' },
      { stepNumber: 4, action: 'Verify error does not expose technical details', expectedResult: 'No stack traces or sensitive info shown' },
      { stepNumber: 5, action: 'Verify error is logged', expectedResult: 'Error recorded in system logs' },
    ],
    expectedResultsTemplate: 'Error messages are appropriate and errors are logged',
    acceptanceCriteriaTemplate: 'Errors are handled gracefully with appropriate messaging',
    defaultRiskLevel: 'medium',
    variables: ['SYSTEM_NAME'],
  },
];

const PQ_TEST_TEMPLATES: TestCaseTemplate[] = [
  {
    id: 'pq-wf-001',
    category: 'workflow_testing',
    titleTemplate: 'Verify End-to-End Business Workflow',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} supports complete business workflow execution',
    defaultSteps: [
      { stepNumber: 1, action: 'Login as business user', expectedResult: 'User authenticated' },
      { stepNumber: 2, action: 'Initiate new business process', expectedResult: 'Process started successfully' },
      { stepNumber: 3, action: 'Complete all workflow steps', expectedResult: 'Each step completes without error' },
      { stepNumber: 4, action: 'Submit for approval', expectedResult: 'Approval request created' },
      { stepNumber: 5, action: 'Complete approval and verify final state', expectedResult: 'Process completed, record finalized' },
    ],
    expectedResultsTemplate: 'Business workflow executes completely and correctly',
    acceptanceCriteriaTemplate: 'End-to-end workflow functions as designed',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'pq-perf-001',
    category: 'performance_testing',
    titleTemplate: 'Verify System Response Time',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} meets performance requirements under normal load',
    defaultSteps: [
      { stepNumber: 1, action: 'Measure login page load time', expectedResult: 'Page loads within acceptable time' },
      { stepNumber: 2, action: 'Measure search function response time', expectedResult: 'Search returns results within acceptable time' },
      { stepNumber: 3, action: 'Measure report generation time', expectedResult: 'Report generates within acceptable time' },
      { stepNumber: 4, action: 'Measure data save operation time', expectedResult: 'Save completes within acceptable time' },
      { stepNumber: 5, action: 'Document all measurements', expectedResult: 'Performance metrics recorded' },
    ],
    expectedResultsTemplate: 'System response times meet performance requirements',
    acceptanceCriteriaTemplate: 'All operations complete within specified time limits',
    defaultRiskLevel: 'medium',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'pq-uat-001',
    category: 'user_acceptance',
    titleTemplate: 'User Acceptance - Core Functions',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} meets user acceptance criteria for core functions',
    defaultSteps: [
      { stepNumber: 1, action: 'Business user performs typical daily tasks', expectedResult: 'Tasks completed successfully' },
      { stepNumber: 2, action: 'User verifies data entry functions', expectedResult: 'Data entry works as expected' },
      { stepNumber: 3, action: 'User verifies reporting functions', expectedResult: 'Reports generate correctly' },
      { stepNumber: 4, action: 'User verifies search/query functions', expectedResult: 'Search returns expected results' },
      { stepNumber: 5, action: 'User provides acceptance sign-off', expectedResult: 'User confirms acceptance' },
    ],
    expectedResultsTemplate: 'System meets user acceptance criteria',
    acceptanceCriteriaTemplate: 'Business users accept system functionality',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
  {
    id: 'pq-int-001',
    category: 'integration_testing',
    titleTemplate: 'Verify System Integration',
    objectiveTemplate: 'Confirm {{SYSTEM_NAME}} integrates correctly with connected systems',
    defaultSteps: [
      { stepNumber: 1, action: 'Trigger data export to downstream system', expectedResult: 'Export initiated successfully' },
      { stepNumber: 2, action: 'Verify data received by downstream system', expectedResult: 'Data received correctly' },
      { stepNumber: 3, action: 'Trigger data import from upstream system', expectedResult: 'Import initiated successfully' },
      { stepNumber: 4, action: 'Verify imported data in system', expectedResult: 'Data imported correctly' },
      { stepNumber: 5, action: 'Verify error handling for failed integration', expectedResult: 'Errors handled and logged' },
    ],
    expectedResultsTemplate: 'System integration functions correctly',
    acceptanceCriteriaTemplate: 'All integration points operational',
    defaultRiskLevel: 'high',
    variables: ['SYSTEM_NAME'],
  },
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ValidationProtocolGenerator {
  private sequenceCounter: Map<string, number> = new Map();

  /**
   * Generate a complete validation protocol
   */
  generateProtocol(options: ProtocolGenerationOptions): ValidationProtocol {
    const { type, system, numberPrefix, department, owner, approvalRoles } = options;

    // Get next sequence number
    const seqKey = `${numberPrefix}-${type}`;
    const sequence = (this.sequenceCounter.get(seqKey) || 0) + 1;
    this.sequenceCounter.set(seqKey, sequence);

    const protocolNumber = generateProtocolNumber(type, numberPrefix, sequence);
    const now = new Date();

    // Build sections
    const sections = this.buildSections(type, system, options);

    // Build test cases
    const testCases = this.buildTestCases(type, system, options);

    // Build approvals
    const approvals = this.buildApprovals(approvalRoles);

    const protocol: ValidationProtocol = {
      id: `proto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      protocolNumber,
      version: '1.0',
      title: `${type} Protocol for ${system.name}`,
      system,
      status: 'draft',
      sections,
      testCases,
      deviations: [],
      approvals,
      attachments: [],
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: now,
          user: owner,
          action: 'Protocol Created',
          details: `${type} protocol ${protocolNumber} created from template`,
        },
      ],
      metadata: {
        createdAt: now,
        createdBy: owner,
        modifiedAt: now,
        modifiedBy: owner,
        owner,
        department,
        projectRef: options.projectRef,
        relatedProtocols: options.relatedProtocols || [],
        tags: options.tags || [type, system.name],
      },
    };

    return protocol;
  }

  /**
   * Build protocol sections
   */
  private buildSections(
    type: ProtocolType,
    system: SystemInfo,
    options: ProtocolGenerationOptions
  ): ProtocolSection[] {
    const sections: ProtocolSection[] = [];

    // Common sections with variable substitution
    for (const section of COMMON_SECTIONS) {
      sections.push({
        ...section,
        content: this.substituteVariables(section.content, system, type, options),
      });
    }

    // Type-specific sections
    let typeSections: ProtocolSection[] = [];
    switch (type) {
      case 'IQ':
        typeSections = IQ_SPECIFIC_SECTIONS;
        break;
      case 'OQ':
        typeSections = OQ_SPECIFIC_SECTIONS;
        break;
      case 'PQ':
        typeSections = PQ_SPECIFIC_SECTIONS;
        break;
    }

    for (const section of typeSections) {
      sections.push({
        ...section,
        content: this.substituteVariables(section.content, system, type, options),
      });
    }

    // Add test execution section
    sections.push({
      id: 'test-cases',
      number: '9.0',
      title: 'Test Cases',
      content: 'See test case matrix below.',
      required: true,
    });

    // Add deviation handling section
    sections.push({
      id: 'deviations',
      number: '10.0',
      title: 'Deviation Handling',
      content: `### 10.1 Deviation Procedure
Any result that does not match the expected outcome must be documented as a deviation. Deviations are classified as:

- **Critical**: Affects patient safety, data integrity, or regulatory compliance. Stops execution.
- **Major**: Significant impact on system functionality. May proceed with QA approval.
- **Minor**: Limited impact. May proceed with documentation.
- **Observation**: For information only. No impact on qualification.

### 10.2 Deviation Review
All critical and major deviations must be reviewed by QA before protocol completion.`,
      required: true,
    });

    // Add summary section
    sections.push({
      id: 'summary',
      number: '11.0',
      title: 'Summary and Conclusion',
      content: 'To be completed after test execution. Include overall pass/fail status, deviation summary, and qualification conclusion.',
      required: true,
    });

    return sections;
  }

  /**
   * Build test cases from templates
   */
  private buildTestCases(
    type: ProtocolType,
    system: SystemInfo,
    options: ProtocolGenerationOptions
  ): TestCase[] {
    const testCases: TestCase[] = [];
    let templates: TestCaseTemplate[] = [];

    switch (type) {
      case 'IQ':
        templates = this.getIQTemplates(options.iqConfig);
        break;
      case 'OQ':
        templates = this.getOQTemplates(options.oqConfig);
        break;
      case 'PQ':
        templates = this.getPQTemplates(options.pqConfig);
        break;
    }

    let caseNumber = 1;
    for (const template of templates) {
      const testCase = this.createTestCaseFromTemplate(
        template,
        type,
        caseNumber,
        system,
        options
      );
      testCases.push(testCase);
      caseNumber++;
    }

    return testCases;
  }

  /**
   * Get IQ test templates based on config
   */
  private getIQTemplates(config?: IQTemplateConfig): TestCaseTemplate[] {
    if (!config) {
      return IQ_TEST_TEMPLATES;
    }

    const templates: TestCaseTemplate[] = [];

    if (config.includeHardware) {
      templates.push(...IQ_TEST_TEMPLATES.filter(t => t.category === 'hardware_verification'));
    }
    if (config.includeSoftware) {
      templates.push(...IQ_TEST_TEMPLATES.filter(t => t.category === 'software_installation'));
    }
    if (config.includeNetwork) {
      templates.push(...IQ_TEST_TEMPLATES.filter(t => t.category === 'network_configuration'));
    }
    if (config.includeDocumentation) {
      templates.push(...IQ_TEST_TEMPLATES.filter(t => t.category === 'documentation_review'));
    }

    templates.push(...(config.testCaseTemplates || []));

    return templates;
  }

  /**
   * Get OQ test templates based on config
   */
  private getOQTemplates(config?: OQTemplateConfig): TestCaseTemplate[] {
    if (!config) {
      return OQ_TEST_TEMPLATES;
    }

    const templates: TestCaseTemplate[] = [];

    if (config.includeFunctional) {
      templates.push(...OQ_TEST_TEMPLATES.filter(t => t.category === 'functional_testing'));
    }
    if (config.includeSecurity) {
      templates.push(...OQ_TEST_TEMPLATES.filter(t => t.category === 'security_testing'));
    }
    if (config.includePart11) {
      templates.push(...OQ_TEST_TEMPLATES.filter(t => 
        t.category === 'audit_trail_testing' || t.category === 'electronic_signature'
      ));
    }
    if (config.includeErrorHandling) {
      templates.push(...OQ_TEST_TEMPLATES.filter(t => t.category === 'error_handling'));
    }

    templates.push(...(config.testCaseTemplates || []));

    return templates;
  }

  /**
   * Get PQ test templates based on config
   */
  private getPQTemplates(config?: PQTemplateConfig): TestCaseTemplate[] {
    if (!config) {
      return PQ_TEST_TEMPLATES;
    }

    const templates: TestCaseTemplate[] = [];

    if (config.includeWorkflow) {
      templates.push(...PQ_TEST_TEMPLATES.filter(t => t.category === 'workflow_testing'));
    }
    if (config.includePerformance) {
      templates.push(...PQ_TEST_TEMPLATES.filter(t => t.category === 'performance_testing'));
    }
    if (config.includeUAT) {
      templates.push(...PQ_TEST_TEMPLATES.filter(t => t.category === 'user_acceptance'));
    }
    if (config.includeIntegration) {
      templates.push(...PQ_TEST_TEMPLATES.filter(t => t.category === 'integration_testing'));
    }

    templates.push(...(config.testCaseTemplates || []));

    return templates;
  }

  /**
   * Create test case from template
   */
  private createTestCaseFromTemplate(
    template: TestCaseTemplate,
    type: ProtocolType,
    caseNumber: number,
    system: SystemInfo,
    options: ProtocolGenerationOptions
  ): TestCase {
    const variables: Record<string, string> = {
      SYSTEM_NAME: system.name,
      SYSTEM_VERSION: system.version,
      ENVIRONMENT: system.environment,
      GAMP_CATEGORY: system.gampCategory.toString(),
    };

    const substituteVars = (text: string): string => {
      let result = text;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return result;
    };

    return {
      id: `tc-${type}-${caseNumber.toString().padStart(3, '0')}`,
      number: `${type}-${caseNumber.toString().padStart(3, '0')}`,
      category: template.category,
      title: substituteVars(template.titleTemplate),
      objective: substituteVars(template.objectiveTemplate),
      prerequisites: [],
      steps: template.defaultSteps.map(step => ({
        stepNumber: step.stepNumber,
        action: substituteVars(step.action),
        expectedResult: substituteVars(step.expectedResult),
      })),
      expectedResults: substituteVars(template.expectedResultsTemplate),
      acceptanceCriteria: substituteVars(template.acceptanceCriteriaTemplate),
      riskLevel: template.defaultRiskLevel,
      requirementRefs: [],
      result: 'not_run',
      evidenceRefs: [],
    };
  }

  /**
   * Build approval list
   */
  private buildApprovals(roles: ApprovalRole[]): Approval[] {
    const roleMeanings: Record<ApprovalRole, string> = {
      author: 'I authored this protocol and confirm it is accurate and complete',
      reviewer: 'I reviewed this protocol and confirm it meets requirements',
      qa_approver: 'I approve this protocol for execution on behalf of Quality Assurance',
      system_owner: 'I approve this protocol as System Owner',
      it_approver: 'I approve this protocol from an IT perspective',
      validation_lead: 'I approve this protocol as Validation Lead',
      quality_head: 'I approve this protocol as Head of Quality',
      executed_by: 'I executed the tests in this protocol',
      verified_by: 'I verified the test execution and results',
    };

    return roles.map((role, idx) => ({
      id: `approval-${idx + 1}`,
      role,
      name: '',
      title: '',
      department: '',
      status: 'pending' as const,
      meaning: roleMeanings[role],
    }));
  }

  /**
   * Substitute template variables
   */
  private substituteVariables(
    content: string,
    system: SystemInfo,
    type: ProtocolType,
    options: ProtocolGenerationOptions
  ): string {
    const qualificationTypes: Record<ProtocolType, string> = {
      IQ: 'installed',
      OQ: 'operates as specified',
      PQ: 'performs as intended in production',
    };

    const gampDescriptions: Record<number, string> = {
      1: 'Infrastructure Software',
      2: 'Non-configurable Software',
      3: 'Configurable Software (COTS)',
      4: 'Configured Software',
      5: 'Custom Software',
    };

    const prerequisites: Record<ProtocolType, string> = {
      IQ: `- System has been delivered and staged for installation
- Installation documentation is available
- Required infrastructure is in place
- Personnel are trained on installation procedures`,
      OQ: `- IQ has been successfully completed
- Test data/accounts are available
- System is accessible in test environment
- Personnel are trained on system operation`,
      PQ: `- IQ and OQ have been successfully completed
- System is deployed to production environment
- Business users are available for UAT
- Integration endpoints are available`,
    };

    return content
      .replace(/{{SYSTEM_NAME}}/g, system.name)
      .replace(/{{SYSTEM_VERSION}}/g, system.version)
      .replace(/{{ENVIRONMENT}}/g, system.environment)
      .replace(/{{GAMP_CATEGORY}}/g, system.gampCategory.toString())
      .replace(/{{GAMP_DESCRIPTION}}/g, gampDescriptions[system.gampCategory] || 'Unknown')
      .replace(/{{QUALIFICATION_TYPE}}/g, qualificationTypes[type])
      .replace(/{{PREREQUISITES}}/g, prerequisites[type]);
  }

  /**
   * Reset sequence counters (for testing)
   */
  resetCounters(): void {
    this.sequenceCounter.clear();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let generatorInstance: ValidationProtocolGenerator | null = null;

export function getProtocolGenerator(): ValidationProtocolGenerator {
  if (!generatorInstance) {
    generatorInstance = new ValidationProtocolGenerator();
  }
  return generatorInstance;
}

export function createProtocolGenerator(): ValidationProtocolGenerator {
  return new ValidationProtocolGenerator();
}

export function resetProtocolGenerator(): void {
  generatorInstance = null;
}
