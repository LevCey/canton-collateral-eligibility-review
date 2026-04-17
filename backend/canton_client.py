"""Canton JSON Ledger API v2 client."""

import httpx
from typing import Any


class CantonClient:
    """Thin wrapper around Canton JSON Ledger API v2."""

    def __init__(self, base_url: str, package_name: str):
        self.base_url = base_url.rstrip("/")
        self.package_name = package_name
        self.http = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    def _template_id(self, module: str, entity: str) -> str:
        return f"#{self.package_name}:{module}:{entity}"

    async def get_ledger_end(self) -> int:
        r = await self.http.get("/v2/state/ledger-end")
        r.raise_for_status()
        return r.json()["offset"]

    async def create_contract(
        self, user_id: str, act_as: list[str], template_module: str, template_entity: str, payload: dict[str, Any]
    ) -> dict:
        body = {
            "userId": user_id,
            "actAs": act_as,
            "commands": [
                {
                    "CreateCommand": {
                        "templateId": self._template_id(template_module, template_entity),
                        "createArguments": payload,
                    }
                }
            ],
        }
        r = await self.http.post("/v2/commands/submit-and-wait-for-transaction", json=body)
        r.raise_for_status()
        return r.json()

    async def exercise_choice(
        self, user_id: str, act_as: list[str], contract_id: str, template_module: str, template_entity: str, choice: str, args: dict[str, Any]
    ) -> dict:
        body = {
            "userId": user_id,
            "actAs": act_as,
            "commands": [
                {
                    "ExerciseCommand": {
                        "templateId": self._template_id(template_module, template_entity),
                        "contractId": contract_id,
                        "choice": choice,
                        "choiceArgument": args,
                    }
                }
            ],
        }
        r = await self.http.post("/v2/commands/submit-and-wait-for-transaction", json=body)
        r.raise_for_status()
        return r.json()

    async def query_contracts(self, party: str, template_module: str, template_entity: str) -> list[dict]:
        offset = await self.get_ledger_end()
        template_filter = {
            "filtersByParty": {
                party: {
                    "cumulative": [
                        {
                            "identifierFilter": {
                                "TemplateFilter": {
                                    "value": {
                                        "templateId": self._template_id(template_module, template_entity),
                                        "includeCreatedEventBlob": False,
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
        r = await self.http.post(
            "/v2/state/active-contracts",
            json={"filter": template_filter, "verbose": True, "activeAtOffset": offset},
        )
        r.raise_for_status()
        return r.json() if isinstance(r.json(), list) else []

    async def close(self):
        await self.http.aclose()
