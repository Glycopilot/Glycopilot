import urllib.request
import json as json_module

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Meal, UserMeal
from .serializers import MealSerializer, UserMealSerializer

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v0/product/{}.json"
OPEN_FOOD_FACTS_SEARCH_URL = (
    "https://world.openfoodfacts.org/cgi/search.pl"
    "?search_terms={}&search_simple=1&action=process&json=1&page_size=10&lc=fr"
)


def _parse_off_product(product, barcode=None):
    n = product.get("nutriments") or {}
    return {
        "name": (
            product.get("product_name_fr")
            or product.get("product_name")
            or "Produit inconnu"
        ),
        "barcode": barcode or product.get("code"),
        "calories": n.get("energy-kcal_100g"),
        "glucides": n.get("carbohydrates_100g"),
        "proteines": n.get("proteins_100g"),
        "lipides": n.get("fat_100g"),
        "image_url": product.get("image_front_url"),
    }


def _fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "GlycoPilot/1.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json_module.loads(resp.read().decode())


class MealViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Meal.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search))
        return qs.order_by("name")

    @action(detail=False, methods=["get"], url_path="by-barcode")
    def by_barcode(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response({"error": "Paramètre 'code' requis."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            meal = Meal.objects.get(barcode=code)
            return Response(MealSerializer(meal).data)
        except Meal.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="from-openfood")
    def from_openfood(self, request):
        barcode = request.data.get("barcode")
        if not barcode:
            return Response({"error": "Paramètre 'barcode' requis."}, status=status.HTTP_400_BAD_REQUEST)

        # Retourner depuis le cache si déjà présent
        try:
            meal = Meal.objects.get(barcode=barcode)
            return Response(MealSerializer(meal).data)
        except Meal.DoesNotExist:
            pass

        try:
            data = _fetch_url(OPEN_FOOD_FACTS_URL.format(barcode))
        except Exception:
            return Response({"error": "Open Food Facts injoignable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if data.get("status") != 1:
            return Response({"error": "Produit introuvable."}, status=status.HTTP_404_NOT_FOUND)

        parsed = _parse_off_product(data["product"], barcode=barcode)

        # get_or_create pour éviter les race conditions sur le barcode unique
        try:
            meal, _ = Meal.objects.get_or_create(
                barcode=parsed["barcode"],
                defaults={
                    "name": parsed["name"],
                    "calories": int(parsed["calories"]) if parsed["calories"] is not None else None,
                    "glucides": parsed["glucides"],
                    "proteines": parsed["proteines"],
                    "lipides": parsed["lipides"],
                    "link_photo": parsed["image_url"],
                    "source": Meal.SOURCE_OPENFOOD,
                },
            )
        except Exception as exc:
            return Response({"error": f"Erreur création produit : {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(MealSerializer(meal).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="search-openfood")
    def search_openfood(self, request):
        query = request.query_params.get("q")
        if not query:
            return Response({"error": "Paramètre 'q' requis."}, status=status.HTTP_400_BAD_REQUEST)

        import urllib.parse
        url = OPEN_FOOD_FACTS_SEARCH_URL.format(urllib.parse.quote(query))
        try:
            data = _fetch_url(url)
        except Exception:
            return Response({"error": "Open Food Facts injoignable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        results = []
        for product in data.get("products") or []:
            parsed = _parse_off_product(product)
            if not parsed["name"] or parsed["name"] == "Produit inconnu":
                continue
            results.append(parsed)

        return Response(results)


class UserMealViewSet(viewsets.ModelViewSet):
    serializer_class = UserMealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_user(self):
        user_id = self.request.query_params.get("user_id")
        if user_id and self.request.auth == "service_token":
            from apps.users.models import User
            try:
                return User.objects.get(id_user=user_id).auth_account
            except User.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound(f"Utilisateur {user_id} introuvable.")
        return self.request.user

    def get_queryset(self):
        qs = UserMeal.objects.filter(user=self._resolve_user()).select_related("meal")
        date_str = self.request.query_params.get("date")
        if date_str:
            qs = qs.filter(taken_at__date=date_str)
        return qs.order_by("taken_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="range-summary")
    def range_summary(self, request):
        from datetime import date as date_type, timedelta

        date_from_str = request.query_params.get("date_from")
        date_to_str = request.query_params.get("date_to")
        if not date_from_str or not date_to_str:
            return Response(
                {"error": "Paramètres 'date_from' et 'date_to' requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            date_from = date_type.fromisoformat(date_from_str)
            date_to = date_type.fromisoformat(date_to_str)
        except ValueError:
            return Response({"error": "Format de date invalide."}, status=status.HTTP_400_BAD_REQUEST)

        qs = UserMeal.objects.filter(
            user=self._resolve_user(),
            taken_at__date__gte=date_from,
            taken_at__date__lte=date_to,
        ).select_related("meal")

        from collections import defaultdict
        by_date: dict = defaultdict(list)
        for um in qs:
            by_date[um.taken_at.date()].append(um)

        result = []
        current = date_from
        while current <= date_to:
            items = by_date.get(current, [])
            total_glucides = 0.0
            total_calories = 0.0
            for um in items:
                factor = (um.portion_g / 100.0) if um.portion_g else 1.0
                total_glucides += (um.meal.glucides or 0) * factor
                total_calories += (um.meal.calories or 0) * factor
            result.append({
                "date": current.isoformat(),
                "total_glucides": round(total_glucides, 1),
                "total_calories": round(total_calories),
                "meal_count": len(items),
            })
            current += timedelta(days=1)

        return Response(result)

    @action(detail=False, methods=["get"], url_path="daily-summary")
    def daily_summary(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            from datetime import date
            date_str = date.today().isoformat()

        qs = UserMeal.objects.filter(
            user=self._resolve_user(), taken_at__date=date_str
        ).select_related("meal")

        total_glucides = 0.0
        total_calories = 0.0
        total_proteines = 0.0
        total_lipides = 0.0
        meals_by_type = {"breakfast": 0, "lunch": 0, "snack": 0, "dinner": 0}

        for um in qs:
            factor = (um.portion_g / 100.0) if um.portion_g else 1.0
            total_glucides += (um.meal.glucides or 0) * factor
            total_calories += (um.meal.calories or 0) * factor
            total_proteines += (um.meal.proteines or 0) * factor
            total_lipides += (um.meal.lipides or 0) * factor
            if um.meal_type in meals_by_type:
                meals_by_type[um.meal_type] += 1

        return Response({
            "date": date_str,
            "total_glucides": round(total_glucides, 1),
            "total_calories": round(total_calories),
            "total_proteines": round(total_proteines, 1),
            "total_lipides": round(total_lipides, 1),
            "meal_count": qs.count(),
            "meals_by_type": meals_by_type,
        })
