/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useReducer, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFieldText,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createActionConnector, updateActionConnector } from '../../lib/action_connector_api';
import { SectionError, ErrableFormRow } from '../../components/page_error';
import { useAppDependencies } from '../../app_dependencies';
import { connectorReducer } from './connector_reducer';
import { ActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionConnector, IErrorObject } from '../../../types';

interface ActionConnectorProps {
  initialAction: any;
  actionTypeName: string;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ActionConnectorForm = ({
  initialAction,
  actionTypeName,
  setFlyoutVisibility,
}: ActionConnectorProps) => {
  const {
    core: { http },
    plugins: { toastNotifications },
    actionTypeRegistry,
  } = useAppDependencies();

  const { reloadConnectors } = useContext(ActionsConnectorsContext);

  // hooks
  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialAction });

  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setActionConfigProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setConfigProperty' }, payload: { key, value } });
  };

  const setActionSecretsProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setSecretsProperty' }, payload: { key, value } });
  };

  useEffect(() => {
    setServerError(null);
  }, []);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  const actionTypeRegisterd = actionTypeRegistry.get(initialAction.actionTypeId);
  if (actionTypeRegisterd === null) return null;

  function validateBaseProperties(actionObject: ActionConnector) {
    const validationResult = { errors: {} };
    const errors = {
      description: new Array<string>(),
    };
    validationResult.errors = errors;
    if (!actionObject.description) {
      errors.description.push(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: 'Description is required.',
          }
        )
      );
    }
    return validationResult;
  }

  const FieldsComponent = actionTypeRegisterd.actionConnectorFields;
  const errors = {
    ...actionTypeRegisterd.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  async function onActionConnectorSave(): Promise<any> {
    try {
      let savingMessage;
      let savedConnector;
      if (connector.id === undefined) {
        savedConnector = await createActionConnector({ http, connector });
        savingMessage = 'Updated';
      } else {
        savedConnector = await updateActionConnector({ http, connector, id: connector.id });
        savingMessage = 'Created';
      }
      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.saveSuccessNotificationText',
          {
            defaultMessage: "{savingMessage} '{connectorName}'",
            values: {
              connectorName: savedConnector.description,
              savingMessage,
            },
          }
        )
      );
      return savedConnector;
    } catch (error) {
      return {
        error,
      };
    }
  }

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiForm>
          {serverError && (
            <Fragment>
              <SectionError
                title={
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.saveActionErrorTitle"
                    defaultMessage="Error saving action"
                  />
                }
                error={serverError}
              />
              <EuiSpacer />
            </Fragment>
          )}
          <ErrableFormRow
            id="actionDescription"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.actionDescritionLabel"
                defaultMessage="Description"
              />
            }
            errorKey="description"
            isShowingErrors={hasErrors && connector.description !== undefined}
            errors={errors}
          >
            <EuiFieldText
              fullWidth
              name="description"
              data-test-subj="descriptionInput"
              value={connector.description || ''}
              onChange={e => {
                setActionProperty('description', e.target.value);
              }}
              onBlur={() => {
                if (!connector.description) {
                  setActionProperty('description', '');
                }
              }}
            />
          </ErrableFormRow>
          <EuiSpacer size="s" />
          {FieldsComponent !== null ? (
            <FieldsComponent
              action={connector}
              errors={errors}
              editActionConfig={setActionConfigProperty}
              editActionSecrets={setActionSecretsProperty}
              hasErrors={hasErrors}
            >
              {initialAction.actionTypeId === null ? (
                <Fragment>
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningTitleText',
                      {
                        defaultMessage: 'Account may not be configured',
                      }
                    )}
                    color="warning"
                    iconType="help"
                  >
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningDescriptionText"
                          defaultMessage="To create this action, you must configure at least one {accountType} account. {docLink}"
                          values={{
                            accountType: actionTypeName,
                            docLink: (
                              <EuiLink target="_blank">
                                <FormattedMessage
                                  id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningHelpLinkText"
                                  defaultMessage="Learn more."
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer />
                </Fragment>
              ) : null}
            </FieldsComponent>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setFlyoutVisibility(false)}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveActionButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAction = await onActionConnectorSave();
                setIsSaving(false);
                if (savedAction && savedAction.error) {
                  return setServerError(savedAction.error);
                }
                setFlyoutVisibility(false);
                reloadConnectors();
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};